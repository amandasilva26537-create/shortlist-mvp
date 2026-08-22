DROP POLICY IF EXISTS "open access storage select" ON storage.objects;
DROP POLICY IF EXISTS "open access storage insert" ON storage.objects;
DROP POLICY IF EXISTS "open access storage update" ON storage.objects;
DROP POLICY IF EXISTS "open access storage delete" ON storage.objects;

CREATE POLICY "open access storage select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('candidate-files', 'client-logos', 'job-briefings'));

CREATE POLICY "open access storage insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id IN ('candidate-files', 'client-logos', 'job-briefings'));

CREATE POLICY "open access storage update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id IN ('candidate-files', 'client-logos', 'job-briefings'))
WITH CHECK (bucket_id IN ('candidate-files', 'client-logos', 'job-briefings'));

CREATE POLICY "open access storage delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id IN ('candidate-files', 'client-logos', 'job-briefings'));