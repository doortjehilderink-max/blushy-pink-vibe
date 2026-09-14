CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, 'BlushLuxe lid'), '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (id, display_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data ->> 'display_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(u.raw_user_meta_data ->> 'name', ''),
    split_part(COALESCE(u.email, 'BlushLuxe lid'), '@', 1)
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

DROP POLICY IF EXISTS "follows_select_all" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;

CREATE POLICY "follows_select_all"
ON public.follows FOR SELECT
TO public
USING (true);

CREATE POLICY "follows_insert_own"
ON public.follows FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = follower_id
  AND follower_id <> following_id
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = following_id)
);

CREATE POLICY "follows_delete_own"
ON public.follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);