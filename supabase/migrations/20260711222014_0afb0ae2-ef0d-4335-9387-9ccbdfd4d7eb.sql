
-- 1) Restrict storage: drop broad anon+auth read; only owner can read
DROP POLICY IF EXISTS "anon read app buckets" ON storage.objects;
DROP POLICY IF EXISTS "auth read app buckets" ON storage.objects;

CREATE POLICY "auth read own app objects" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = ANY (ARRAY['candidate-files','client-logos','job-briefings'])
    AND owner = auth.uid()
  );

-- 2) manager_feedback: remove anonymous insert (server function uses service role with token check)
DROP POLICY IF EXISTS "mf public insert on published" ON manager_feedback;

-- 3) Revoke EXECUTE on SECURITY DEFINER trigger functions from signed-in users
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
