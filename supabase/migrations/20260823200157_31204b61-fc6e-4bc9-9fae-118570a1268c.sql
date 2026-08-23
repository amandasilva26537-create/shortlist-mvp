-- 1) Storage: remove open/anonymous access to private buckets.
DROP POLICY IF EXISTS "open access storage select" ON storage.objects;
DROP POLICY IF EXISTS "open access storage insert" ON storage.objects;
DROP POLICY IF EXISTS "open access storage update" ON storage.objects;
DROP POLICY IF EXISTS "open access storage delete" ON storage.objects;

-- 2) Remove anonymous share-token read access to candidate PII, documents,
-- evaluations and manager feedback. The client portal now reads these tables
-- exclusively through the backend, which validates the share token and the
-- candidate's membership in that shortlist, and returns only client-safe fields.
DROP POLICY IF EXISTS "candidates public via published shortlist" ON public.candidates;
DROP POLICY IF EXISTS "docs public visible only" ON public.candidate_documents;
DROP POLICY IF EXISTS "eval public via published shortlist" ON public.candidate_job_evaluations;
DROP POLICY IF EXISTS "mf public read" ON public.manager_feedback;

REVOKE SELECT ON public.candidates FROM anon;
REVOKE SELECT ON public.candidate_documents FROM anon;
REVOKE SELECT ON public.candidate_job_evaluations FROM anon;
REVOKE SELECT ON public.manager_feedback FROM anon;