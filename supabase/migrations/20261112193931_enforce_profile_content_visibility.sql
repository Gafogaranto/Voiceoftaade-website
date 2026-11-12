create or replace function private.can_view_reader_profile_content(target_user_id uuid,content_visibility text)
returns boolean language sql stable security definer set search_path=''
as $$
 select target_user_id is not null and (
  auth.uid()=target_user_id
  or exists(select 1 from public.reader_profile_privacy v where v.user_id=target_user_id and (
   (v.profile_visibility='public' and content_visibility='public')
   or (v.profile_visibility in ('public','community') and content_visibility='community' and exists(
    select 1 from public.community_members a join public.community_members b on b.community_id=a.community_id join public.communities c on c.id=a.community_id
    where a.user_id=auth.uid() and b.user_id=target_user_id and a.status='active' and b.status='active' and c.status='active'
   ))
  ))
 );
$$;
revoke all on function private.can_view_reader_profile_content(uuid,text) from public,anon,authenticated;
grant execute on function private.can_view_reader_profile_content(uuid,text) to anon,authenticated;
drop policy if exists "Readers view permitted profile books" on public.reader_profile_books;
create policy "Readers view permitted profile books" on public.reader_profile_books for select to anon,authenticated
using(user_id=(select auth.uid()) or private.can_view_reader_profile_content(user_id,case when item_type='favourite' then (select v.favourite_books_visibility from public.reader_profile_privacy v where v.user_id=reader_profile_books.user_id) else (select v.recommendations_visibility from public.reader_profile_privacy v where v.user_id=reader_profile_books.user_id) end));
drop policy if exists "Readers view permitted profile recommendations" on public.reader_profile_recommendations;
create policy "Readers view permitted profile recommendations" on public.reader_profile_recommendations for select to anon,authenticated
using(user_id=(select auth.uid()) or private.can_view_reader_profile_content(user_id,(select v.recommendations_visibility from public.reader_profile_privacy v where v.user_id=reader_profile_recommendations.user_id)));
