-- Update respond_to_bone_invite to auto-decline other open invites
-- for the same match when one is accepted.
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

  -- Update the target invite
  UPDATE public.meal_invites SET status = p_response WHERE id = p_bone_id;

  -- If accepted, auto-decline all other open invites for this match
  IF p_response = 'accepted' THEN
    UPDATE public.meal_invites
      SET status = 'declined'
    WHERE match_id = v_bone_match
      AND id <> p_bone_id
      AND status = 'open';
  END IF;
END;
$$;
