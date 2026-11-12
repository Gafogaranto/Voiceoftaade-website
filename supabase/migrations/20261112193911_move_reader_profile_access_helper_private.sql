create schema if not exists private;
create or replace function private.can_view_reader_profile(target_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select target_user_id is not null and (
  auth.uid()=target_user_id
  or exists(select 1 from public.reader_profile_privacy v where v.user_id=target_user_id and v.profile_visibility='public')
  or exists(select 1 from public.reader_profile_privacy v where v.user_id=target_user_id and v.profile_visibility='community' and exists(
   select 1 from public.community_members a join public.community_members b on b.community_id=a.community_id join public.communities c on c.id=a.community_id
   where a.user_id=auth.uid() and b.user_id=target_user_id and a.status='active' and b.status='active' and c.status='active'
  ))
 );
$$;
revoke all on function private.can_view_reader_profile(uuid) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.can_view_reader_profile(uuid) to anon,authenticated;
create or replace function public.get_public_reader_profile(target_user_id uuid)
returns table(id uuid,display_name text,avatar_url text,bio text,location text,website_url text,reading_interests text,created_at timestamptz,profession text,education text,city text,country text,favourite_genres text,currently_reading text,favourite_quote text)
language sql stable security definer set search_path=''
as $$ select p.id,coalesce(nullif(trim(p.display_name),''),'Voiceoftaade reader'),p.avatar_url,p.bio,p.location,p.website_url,p.reading_interests,p.created_at,p.profession,p.education,p.city,p.country,p.favourite_genres,p.currently_reading,p.favourite_quote from public.profiles p where p.id=target_user_id and private.can_view_reader_profile(p.id); $$;
drop policy if exists "Readers view permitted profile books" on public.reader_profile_books;
create policy "Readers view permitted profile books" on public.reader_profile_books for select to anon,authenticated
using(user_id=(select auth.uid()) or (private.can_view_reader_profile(user_id) and exists(select 1 from public.reader_profile_privacy v where v.user_id=reader_profile_books.user_id and ((reader_profile_books.item_type='favourite' and v.favourite_books_visibility in ('public','community')) or (reader_profile_books.item_type='recommendation' and v.recommendations_visibility in ('public','community'))))));
drop policy if exists "Readers view permitted profile recommendations" on public.reader_profile_recommendations;
create policy "Readers view permitted profile recommendations" on public.reader_profile_recommendations for select to anon,authenticated
using(user_id=(select auth.uid()) or (private.can_view_reader_profile(user_id) and exists(select 1 from public.reader_profile_privacy v where v.user_id=reader_profile_recommendations.user_id and v.recommendations_visibility in ('public','community'))));
drop policy if exists "Readers recommend profiles on their own page" on public.reader_profile_recommendations;
create policy "Readers recommend profiles on their own page" on public.reader_profile_recommendations for insert to authenticated
with check(user_id=(select auth.uid()) and private.can_view_reader_profile(recommended_user_id));
drop function public.can_view_reader_profile(uuid);