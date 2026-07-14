GRANT EXECUTE ON FUNCTION private.is_active_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;