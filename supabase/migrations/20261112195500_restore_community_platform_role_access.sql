-- Restore the minimum privileges required by the existing self-only RLS policy.
grant select on table public.community_platform_roles to authenticated;
-- These SECURITY DEFINER predicates read platform roles on behalf of the caller.
grant execute on function public.is_community_platform_staff() to anon, authenticated;
grant execute on function public.is_community_platform_owner(uuid) to authenticated;
