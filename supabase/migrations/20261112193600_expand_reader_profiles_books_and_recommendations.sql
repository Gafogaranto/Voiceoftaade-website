alter table public.profiles
  add column if not exists profession text,
  add column if not exists education text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists favourite_genres text,
  add column if not exists currently_reading text,
  add column if not exists favourite_quote text;
alter table public.reader_profile_privacy
  add column if not exists favourite_books_visibility text not null default 'community' check(favourite_books_visibility in ('public','community','private')),
  add column if not exists recommendations_visibility text not null default 'community' check(recommendations_visibility in ('public','community','private'));
create or replace function public.can_view_reader_profile(target_user_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select target_user_id is not null and (
 auth.uid()=target_user_id
 or exists(select 1 from public.reader_profile_privacy v where v.user_id=target_user_id and v.profile_visibility='public')
 or exists(select 1 from public.reader_profile_privacy v where v.user_id=target_user_id and v.profile_visibility='community' and exists(
  select 1 from public.community_members a join public.community_members b on b.community_id=a.community_id join public.communities c on c.id=a.community_id
  where a.user_id=auth.uid() and b.user_id=target_user_id and a.status='active' and b.status='active' and c.status='active'
 ))
); $$;
revoke all on function public.can_view_reader_profile(uuid) from public,anon,authenticated;
grant execute on function public.can_view_reader_profile(uuid) to anon,authenticated;
create table if not exists public.reader_profile_books (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 item_type text not null check(item_type in ('favourite','recommendation')),
 book_title text not null check(char_length(btrim(book_title)) between 1 and 180),
 book_author text not null default '' check(char_length(book_author)<=120), book_url text,
 note text not null default '' check(char_length(note)<=500), created_at timestamptz not null default now()
);
create index if not exists reader_profile_books_user_idx on public.reader_profile_books(user_id,item_type,created_at desc);
alter table public.reader_profile_books enable row level security;
create policy "Readers view permitted profile books" on public.reader_profile_books for select to anon,authenticated using(user_id=(select auth.uid()) or (public.can_view_reader_profile(user_id) and exists(select 1 from public.reader_profile_privacy v where v.user_id=reader_profile_books.user_id and v.favourite_books_visibility in ('public','community'))));
create policy "Readers manage their own profile books" on public.reader_profile_books for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Readers update their own profile books" on public.reader_profile_books for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy "Readers delete their own profile books" on public.reader_profile_books for delete to authenticated using(user_id=(select auth.uid()));
revoke all on table public.reader_profile_books from public,anon,authenticated;
grant select on table public.reader_profile_books to anon,authenticated;
grant insert,update,delete on table public.reader_profile_books to authenticated;
create table if not exists public.reader_profile_recommendations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 recommended_user_id uuid not null references auth.users(id) on delete cascade, note text not null default '' check(char_length(note)<=500),
 created_at timestamptz not null default now(), constraint reader_profile_recommendations_no_self check(user_id<>recommended_user_id),
 constraint reader_profile_recommendations_unique unique(user_id,recommended_user_id)
);
create index if not exists reader_profile_recommendations_user_idx on public.reader_profile_recommendations(user_id,created_at desc);
alter table public.reader_profile_recommendations enable row level security;
create policy "Readers view permitted profile recommendations" on public.reader_profile_recommendations for select to anon,authenticated using(user_id=(select auth.uid()) or (public.can_view_reader_profile(user_id) and exists(select 1 from public.reader_profile_privacy v where v.user_id=reader_profile_recommendations.user_id and v.recommendations_visibility in ('public','community'))));
create policy "Readers recommend profiles on their own page" on public.reader_profile_recommendations for insert to authenticated with check(user_id=(select auth.uid()) and public.can_view_reader_profile(recommended_user_id));
create policy "Readers remove their own profile recommendations" on public.reader_profile_recommendations for delete to authenticated using(user_id=(select auth.uid()));
revoke all on table public.reader_profile_recommendations from public,anon,authenticated;
grant select on table public.reader_profile_recommendations to anon,authenticated;
grant insert,delete on table public.reader_profile_recommendations to authenticated;
drop function if exists public.get_public_reader_profile(uuid);
create function public.get_public_reader_profile(target_user_id uuid)
returns table(id uuid,display_name text,avatar_url text,bio text,location text,website_url text,reading_interests text,created_at timestamptz,profession text,education text,city text,country text,favourite_genres text,currently_reading text,favourite_quote text)
language sql stable security definer set search_path=''
as $$ select p.id,coalesce(nullif(trim(p.display_name),''),'Voiceoftaade reader'),p.avatar_url,p.bio,p.location,p.website_url,p.reading_interests,p.created_at,p.profession,p.education,p.city,p.country,p.favourite_genres,p.currently_reading,p.favourite_quote from public.profiles p where p.id=target_user_id and public.can_view_reader_profile(p.id); $$;
revoke all on function public.get_public_reader_profile(uuid) from public,anon,authenticated;
grant execute on function public.get_public_reader_profile(uuid) to anon,authenticated;
create or replace function public.get_reader_profile_visibility(target_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); settings public.reader_profile_privacy%rowtype;
begin
 select * into settings from public.reader_profile_privacy where user_id=target_user_id;
 if not found then
  settings.profile_visibility:='community';settings.reading_activity_visibility:='community';settings.favourites_visibility:='community';settings.saved_collections_visibility:='community';settings.reviews_visibility:='community';settings.allow_message_requests:=true;settings.favourite_books_visibility:='community';settings.recommendations_visibility:='community';
 end if;
 if not public.can_view_reader_profile(target_user_id) then return null; end if;
 return jsonb_build_object('profile_visibility',settings.profile_visibility,'reading_activity_visibility',settings.reading_activity_visibility,'favourites_visibility',settings.favourites_visibility,'saved_collections_visibility',settings.saved_collections_visibility,'reviews_visibility',settings.reviews_visibility,'allow_message_requests',settings.allow_message_requests,'favourite_books_visibility',settings.favourite_books_visibility,'recommendations_visibility',settings.recommendations_visibility);
end; $$;
revoke all on function public.get_reader_profile_visibility(uuid) from public,anon,authenticated;
grant execute on function public.get_reader_profile_visibility(uuid) to anon,authenticated;