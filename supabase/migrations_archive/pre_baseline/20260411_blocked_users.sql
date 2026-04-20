-- Blocked users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (
    blocker_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR blocked_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING (blocker_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Update meal_invites visibility to hide blocked users' public posts (bidirectional)
DROP POLICY IF EXISTS "Meal invite visibility" ON public.meal_invites;
CREATE POLICY "Meal invite visibility"
  ON public.meal_invites FOR SELECT
  TO authenticated
  USING (
    (
      visibility = 'public'
      AND user_id NOT IN (
        SELECT blocked_id FROM public.blocked_users
        WHERE blocker_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
      AND user_id NOT IN (
        SELECT blocker_id FROM public.blocked_users
        WHERE blocked_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
    OR user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR match_id IN (
      SELECT id FROM public.buddy_matches
      WHERE user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Update chat_messages: prevent viewing messages from blocked users
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
CREATE POLICY "Users can view chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    match_id IN (
      SELECT id FROM public.buddy_matches
      WHERE user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
         OR user2_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND sender_id NOT IN (
      SELECT blocked_id FROM public.blocked_users
      WHERE blocker_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Prevent sending messages to users who blocked you
DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
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
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (
        blocker_id IN (
          SELECT CASE
            WHEN user1_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()) THEN user2_id
            ELSE user1_id
          END FROM public.buddy_matches WHERE id = match_id
        )
        AND blocked_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );
