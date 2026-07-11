
-- Add per-process status/timestamp and uniqueness for shortlist_candidates
ALTER TABLE public.shortlist_candidates
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'adicionado',
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shortlist_candidates_unique_pair'
  ) THEN
    ALTER TABLE public.shortlist_candidates
      ADD CONSTRAINT shortlist_candidates_unique_pair UNIQUE (shortlist_id, candidate_id);
  END IF;
END $$;
