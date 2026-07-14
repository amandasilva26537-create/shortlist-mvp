
CREATE OR REPLACE FUNCTION public.current_share_token()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.headers', true)::json->>'x-share-token', '');
$$;
REVOKE ALL ON FUNCTION public.current_share_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_share_token() TO anon, authenticated;
