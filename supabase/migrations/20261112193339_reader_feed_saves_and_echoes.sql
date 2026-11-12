create table if not exists public.reader_feed_saves (
  post_id uuid not null references public.reader_feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create index if not exists reader_feed_saves_user_idx on public.reader_feed_saves(user_id,created_at desc);
alter table public.reader_feed_saves enable row level security;
create policy "Readers view their own saved feed posts" on public.reader_feed_saves for select to authenticated using(user_id=(select auth.uid()));
create policy "Readers save readable feed posts" on public.reader_feed_saves for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id)))));
create policy "Readers remove their own saved posts" on public.reader_feed_saves for delete to authenticated using(user_id=(select auth.uid()));
revoke all on table public.reader_feed_saves from public,anon,authenticated;
grant select,insert,delete on table public.reader_feed_saves to authenticated;

create table if not exists public.reader_feed_echoes (
  post_id uuid not null references public.reader_feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create index if not exists reader_feed_echoes_post_idx on public.reader_feed_echoes(post_id,created_at desc);
alter table public.reader_feed_echoes enable row level security;
create policy "Readers view echoes on readable posts" on public.reader_feed_echoes for select to anon,authenticated using(exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id)))));
create policy "Readers echo readable posts" on public.reader_feed_echoes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id)))));
create policy "Readers remove their own echoes" on public.reader_feed_echoes for delete to authenticated using(user_id=(select auth.uid()));
revoke all on table public.reader_feed_echoes from public,anon,authenticated;
grant select,insert,delete on table public.reader_feed_echoes to anon,authenticated;