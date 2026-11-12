-- Platform owner/admin review workflow for all pending community spaces.
create or replace function public.review_community_creation(
  p_community_id uuid,
  p_decision text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare v_community public.communities%rowtype;
begin
  if auth.uid() is null or p_decision not in ('approved','rejected') then
    raise exception 'Invalid community review.' using errcode='22023';
  end if;
  if not public.is_community_platform_staff() then
    raise exception 'Only platform owners and administrators can review community proposals.' using errcode='42501';
  end if;
  select * into v_community from public.communities where id=p_community_id for update;
  if not found then raise exception 'Community proposal not found.' using errcode='P0002'; end if;
  if v_community.status<>'pending' then raise exception 'This community proposal has already been reviewed.' using errcode='55000'; end if;
  update public.communities set status=case when p_decision='approved' then 'active' else 'declined' end,updated_by=auth.uid(),updated_at=now() where id=p_community_id;
  if p_decision='approved' then
    insert into public.community_members(community_id,user_id,role,status,joined_at) values(p_community_id,v_community.created_by,'owner','active',now())
    on conflict(community_id,user_id) do update set role='owner',status='active',joined_at=now();
  end if;
  return true;
end;
$function$;
revoke all on function public.review_community_creation(uuid,text) from public,anon;
grant execute on function public.review_community_creation(uuid,text) to authenticated;
