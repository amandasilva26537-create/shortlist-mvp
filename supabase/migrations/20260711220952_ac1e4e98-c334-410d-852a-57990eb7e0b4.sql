
CREATE POLICY "auth read app buckets" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('candidate-files','client-logos','job-briefings'));

CREATE POLICY "auth insert app buckets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('candidate-files','client-logos','job-briefings') AND owner = auth.uid());

CREATE POLICY "auth update own objects" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('candidate-files','client-logos','job-briefings') AND owner = auth.uid());

CREATE POLICY "auth delete own objects" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('candidate-files','client-logos','job-briefings') AND owner = auth.uid());

-- Public portal can read any file in these buckets (URLs are non-guessable, and access is gated by the app rendering)
CREATE POLICY "anon read app buckets" ON storage.objects FOR SELECT TO anon
USING (bucket_id IN ('candidate-files','client-logos','job-briefings'));
