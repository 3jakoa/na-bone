-- Rename tables to be more descriptive.
-- swipes        → profile_swipes
-- matches       → buddy_matches
-- bones         → meal_invites
-- messages      → chat_messages
-- (profiles and restaurants stay as-is)

-- 1. Rename tables
ALTER TABLE public.swipes   RENAME TO profile_swipes;
ALTER TABLE public.matches  RENAME TO buddy_matches;
ALTER TABLE public.bones    RENAME TO meal_invites;
ALTER TABLE public.messages RENAME TO chat_messages;

-- 2. Rename constraints/indexes to match new table names
ALTER TABLE public.meal_invites
  RENAME CONSTRAINT bones_visibility_match_chk TO meal_invites_visibility_match_chk;
ALTER INDEX IF EXISTS bones_public_idx RENAME TO meal_invites_public_idx;

-- 3. Recreate functions that reference old table names in their body

-- check_and_create_match (trigger on profile_swipes)
CREATE OR REPLACE FUNCTION check_and_create_match()
RETURNS trigger AS $$
DECLARE
  other_swipe_exists boolean;
  p1 uuid;
  p2 uuid;
BEGIN
  IF new.direction = 'right' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.profile_swipes
      WHERE swiper_id = new.swiped_id
        AND swiped_id = new.swiper_id
        AND direction = 'right'
    ) INTO other_swipe_exists;

    IF other_swipe_exists THEN
      IF new.swiper_id < new.swiped_id THEN
        p1 := new.swiper_id;
        p2 := new.swiped_id;
      ELSE
        p1 := new.swiped_id;
        p2 := new.swiper_id;
      END IF;

      INSERT INTO public.buddy_matches (user1_id, user2_id)
      VALUES (p1, p2)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- respond_to_public_bone
CREATE OR REPLACE FUNCTION public.respond_to_public_bone(p_bone_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responder_profile uuid;
  v_author_profile uuid;
  v_match_id uuid;
  v_p1 uuid;
  v_p2 uuid;
  v_visibility text;
  v_status text;
BEGIN
  SELECT id INTO v_responder_profile FROM public.profiles WHERE user_id = auth.uid();
  IF v_responder_profile IS NULL THEN
    RAISE EXCEPTION 'No profile for current user';
  END IF;

  SELECT user_id, visibility, status
    INTO v_author_profile, v_visibility, v_status
  FROM public.meal_invites WHERE id = p_bone_id;

  IF v_author_profile IS NULL THEN
    RAISE EXCEPTION 'Bone not found';
  END IF;
  IF v_visibility <> 'public' OR v_status <> 'open' THEN
    RAISE EXCEPTION 'Bone is not an open public invite';
  END IF;
  IF v_author_profile = v_responder_profile THEN
    RAISE EXCEPTION 'Cannot respond to your own bone';
  END IF;

  IF v_responder_profile < v_author_profile THEN
    v_p1 := v_responder_profile; v_p2 := v_author_profile;
  ELSE
    v_p1 := v_author_profile; v_p2 := v_responder_profile;
  END IF;

  SELECT id INTO v_match_id FROM public.buddy_matches
    WHERE user1_id = v_p1 AND user2_id = v_p2;

  IF v_match_id IS NULL THEN
    INSERT INTO public.buddy_matches (user1_id, user2_id)
    VALUES (v_p1, v_p2)
    RETURNING id INTO v_match_id;
  END IF;

  UPDATE public.meal_invites
    SET match_id = v_match_id,
        visibility = 'private',
        status = 'accepted'
    WHERE id = p_bone_id;

  RETURN v_match_id;
END;
$$;

-- respond_to_bone_invite
CREATE OR REPLACE FUNCTION public.respond_to_bone_invite(p_bone_id uuid, p_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_responder uuid;
  v_bone_match uuid;
  v_bone_status text;
  v_bone_owner uuid;
BEGIN
  SELECT id INTO v_responder FROM public.profiles WHERE user_id = auth.uid();
  IF v_responder IS NULL THEN
    RAISE EXCEPTION 'No profile';
  END IF;

  SELECT match_id, status, user_id
    INTO v_bone_match, v_bone_status, v_bone_owner
  FROM public.meal_invites WHERE id = p_bone_id;

  IF v_bone_match IS NULL THEN
    RAISE EXCEPTION 'Bone not found';
  END IF;
  IF v_bone_status <> 'open' THEN
    RAISE EXCEPTION 'Bone is not open';
  END IF;
  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;
  IF v_bone_owner = v_responder THEN
    RAISE EXCEPTION 'Cannot respond to your own bone';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.buddy_matches
    WHERE id = v_bone_match
      AND (user1_id = v_responder OR user2_id = v_responder)
  ) THEN
    RAISE EXCEPTION 'Not a member of this match';
  END IF;

  UPDATE public.meal_invites SET status = p_response WHERE id = p_bone_id;
END;
$$;

-- 4. Drop and recreate RLS policies that reference renamed tables

-- meal_invites: "Bones visibility" references buddy_matches
DROP POLICY IF EXISTS "Bones visibility" ON public.meal_invites;
CREATE POLICY "Meal invite visibility"
  ON public.meal_invites FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR match_id IN (
      SELECT id FROM public.buddy_matches
      WHERE user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- chat_messages: policies reference buddy_matches
DROP POLICY IF EXISTS "Users can view messages in their matches" ON public.chat_messages;
CREATE POLICY "Users can view chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    match_id IN (
      SELECT id FROM public.buddy_matches
      WHERE user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.chat_messages;
CREATE POLICY "Users can send chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND match_id IN (
      SELECT id FROM public.buddy_matches
      WHERE user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Also rename the remaining bone policies for consistency
DROP POLICY IF EXISTS "Anon can view open public bones" ON public.meal_invites;
CREATE POLICY "Anon can view open public meal invites"
  ON public.meal_invites FOR SELECT
  TO anon
  USING (visibility = 'public' AND status = 'open');

DROP POLICY IF EXISTS "Users can insert bones for their matches" ON public.meal_invites;
CREATE POLICY "Users can create meal invites"
  ON public.meal_invites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own bones" ON public.meal_invites;
CREATE POLICY "Users can update their own meal invites"
  ON public.meal_invites FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Rename swipe policies for consistency
DROP POLICY IF EXISTS "Users can view their own swipes" ON public.profile_swipes;
CREATE POLICY "Users can view their own swipes"
  ON public.profile_swipes FOR SELECT
  TO authenticated
  USING (swiper_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own swipes" ON public.profile_swipes;
CREATE POLICY "Users can insert their own swipes"
  ON public.profile_swipes FOR INSERT
  TO authenticated
  WITH CHECK (swiper_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own swipes" ON public.profile_swipes;
CREATE POLICY "Users can update their own swipes"
  ON public.profile_swipes FOR UPDATE
  TO authenticated
  USING (swiper_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (swiper_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Rename match policies for consistency
DROP POLICY IF EXISTS "Users can view their own matches" ON public.buddy_matches;
CREATE POLICY "Users can view their buddy matches"
  ON public.buddy_matches FOR SELECT
  TO authenticated
  USING (
    user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );
