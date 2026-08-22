CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT 'slate',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tags_name_unique ON public.tags (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags team all" ON public.tags FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

CREATE TRIGGER trg_tags_updated BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.candidate_tags (
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, tag_id)
);
CREATE INDEX candidate_tags_tag_idx ON public.candidate_tags (tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_tags TO authenticated;
GRANT ALL ON public.candidate_tags TO service_role;
ALTER TABLE public.candidate_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidate_tags team all" ON public.candidate_tags FOR ALL TO authenticated
  USING (private.is_active_member(auth.uid())) WITH CHECK (private.is_active_member(auth.uid()));

INSERT INTO public.tags (name, color) VALUES
  ('Red Flag', 'red'),
  ('Block List', 'graphite'),
  ('Favorito', 'gold'),
  ('Talento', 'green');