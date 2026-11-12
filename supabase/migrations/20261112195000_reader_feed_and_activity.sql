create table if not exists public.reader_feed_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 title text,
 body text not null,
 visibility text not null default 'public' check (visibility in ('public','followers')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint reader_feed_posts_title_length check (title is null or char_length(title)<=180),
 constraint reader_feed_posts_body_length check (char_length(btrim(body)) between 1 and 12000)
);
create index if not exists reader_feed_posts_created_idx on public.reader_feed_posts(created_at desc);
create index if not exists reader_feed_posts_author_idx on public.reader_feed_posts(author_id,created_at desc);
create table if not exists public.reader_feed_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.reader_feed_posts(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 3000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists reader_feed_comments_post_idx on public.reader_feed_comments(post_id,created_at asc);
create index if not exists reader_feed_comments_author_idx on public.reader_feed_comments(author_id,created_at desc);
create table if not exists public.reader_feed_likes (
 post_id uuid not null references public.reader_feed_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(post_id,user_id)
);
create index if not exists reader_feed_likes_user_idx on public.reader_feed_likes(user_id,created_at desc);
alter table public.reader_feed_posts enable row level security;
alter table public.reader_feed_comments enable row level security;
alter table public.reader_feed_likes enable row level security;
create policy "Reader feed posts visible by visibility" on public.reader_feed_posts for select to anon,authenticated using (visibility='public' or author_id=(select auth.uid()) or (visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=author_id)));
create policy "Readers publish their own feed posts" on public.reader_feed_posts for insert to authenticated with check (author_id=(select auth.uid()));
create policy "Readers edit their own feed posts" on public.reader_feed_posts for update to authenticated using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));
create policy "Readers delete their own feed posts" on public.reader_feed_posts for delete to authenticated using (author_id=(select auth.uid()));
create policy "Comments visible with readable posts" on public.reader_feed_comments for select to anon,authenticated using (exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id))));
create policy "Readers comment on readable posts" on public.reader_feed_comments for insert to authenticated with check (author_id=(select auth.uid()) and exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id))));
create policy "Readers edit their own feed comments" on public.reader_feed_comments for update to authenticated using (author_id=(select auth.uid())) with check (author_id=(select auth.uid()));
create policy "Readers delete their own feed comments" on public.reader_feed_comments for delete to authenticated using (author_id=(select auth.uid()));
create policy "Likes visible with readable posts" on public.reader_feed_likes for select to anon,authenticated using (exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id))));
create policy "Readers like readable posts" on public.reader_feed_likes for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.reader_feed_posts p where p.id=post_id and (p.visibility='public' or p.author_id=(select auth.uid()) or (p.visibility='followers' and exists(select 1 from public.reader_follows f where f.follower_id=(select auth.uid()) and f.followed_id=p.author_id))));
create policy "Readers remove their own likes" on public.reader_feed_likes for delete to authenticated using (user_id=(select auth.uid()));
revoke all on table public.reader_feed_posts,public.reader_feed_comments,public.reader_feed_likes from public,anon,authenticated;
grant select on public.reader_feed_posts,public.reader_feed_comments,public.reader_feed_likes to anon,authenticated;
grant insert,update,delete on public.reader_feed_posts,public.reader_feed_comments to authenticated;
grant insert,delete on public.reader_feed_likes to authenticated;
create schema if not exists private;
