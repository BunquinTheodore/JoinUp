-- Restrict activity posting and joining to verified users.
-- Verified = email confirmed in JWT OR completed profile safety checklist.

-- Posting activities
DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.activities;
DROP POLICY IF EXISTS "Verified users can create activities" ON public.activities;

CREATE POLICY "Verified users can create activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    auth.uid() = host_id
    AND (
      coalesce(nullif(auth.jwt() ->> 'email_confirmed_at', ''), '') <> ''
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND length(trim(coalesce(p.display_name, ''))) >= 2
          AND length(trim(coalesce(p.location, ''))) >= 2
          AND length(trim(coalesce(p.bio, ''))) >= 20
          AND coalesce(array_length(p.interests, 1), 0) >= 2
          AND length(trim(coalesce(p.photo_url, ''))) > 0
      )
    )
  );

-- Joining activities
DROP POLICY IF EXISTS "Authenticated users can join activities" ON public.participants;
DROP POLICY IF EXISTS "Verified users can join activities" ON public.participants;

CREATE POLICY "Verified users can join activities"
  ON public.participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      coalesce(nullif(auth.jwt() ->> 'email_confirmed_at', ''), '') <> ''
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND length(trim(coalesce(p.display_name, ''))) >= 2
          AND length(trim(coalesce(p.location, ''))) >= 2
          AND length(trim(coalesce(p.bio, ''))) >= 20
          AND coalesce(array_length(p.interests, 1), 0) >= 2
          AND length(trim(coalesce(p.photo_url, ''))) > 0
      )
    )
  );
