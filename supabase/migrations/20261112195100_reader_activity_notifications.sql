create table if not exists public.reader_activity_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 notification_type text not null check(notification_type in ('post_like','post_comment','new_follower')),
 post_id uuid references public.reader_feed_posts(id) on delete cascade,
 comment_id uuid references public.reader_feed_comments(id) on delete cascade,
 preview text not null default '',
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists reader_activity_recipient_created_idx on public.reader_activity_notifications(recipient_id,created_at desc);
create index if not exists reader_activity_unread_idx on public.reader_activity_notifications(recipient_id) where read_at is null;
alter table public.reader_activity_notifications enable row level security;
create policy "Readers view their own activity" on public.reader_activity_notifications for select to authenticated using(recipient_id=(select auth.uid()));
create policy "Readers mark their own activity read" on public.reader_activity_notifications for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
grant select,update on public.reader_activity_notifications to authenticated;
create or replace function private.notify_reader_feed_activity()
returns trigger language plpgsql security definer set search_path=''
as $$
declare recipient uuid; actor uuid; post_key uuid; comment_key uuid; kind text; preview_text text;
begin
 if tg_table_name='reader_follows' then
  recipient:=new.followed_id; actor:=new.follower_id; kind:='new_follower'; preview_text:='started following you';
 elsif tg_table_name='reader_feed_likes' then
  select author_id into recipient from public.reader_feed_posts where id=new.post_id;
  actor:=new.user_id; post_key:=new.post_id; kind:='post_like'; preview_text:='liked your post';
 elsif tg_table_name='reader_feed_comments' then
  select author_id into recipient from public.reader_feed_posts where id=new.post_id;
  actor:=new.author_id; post_key:=new.post_id; comment_key:=new.id; kind:='post_comment'; preview_text:=left(new.body,180);
 else return new;
 end if;
 if recipient is not null and actor is distinct from recipient then
  insert into public.reader_activity_notifications(recipient_id,actor_id,notification_type,post_id,comment_id,preview)
  values(recipient,actor,kind,post_key,comment_key,preview_text);
 end if;
 return new;
end;
$$;
revoke all on function private.notify_reader_feed_activity() from public,anon,authenticated;
drop trigger if exists reader_feed_like_notification on public.reader_feed_likes;
create trigger reader_feed_like_notification after insert on public.reader_feed_likes for each row execute function private.notify_reader_feed_activity();
drop trigger if exists reader_feed_comment_notification on public.reader_feed_comments;
create trigger reader_feed_comment_notification after insert on public.reader_feed_comments for each row execute function private.notify_reader_feed_activity();
drop trigger if exists reader_follow_notification on public.reader_follows;
create trigger reader_follow_notification after insert on public.reader_follows for each row execute function private.notify_reader_feed_activity();
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  begin alter publication supabase_realtime add table public.reader_feed_posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reader_feed_comments; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reader_feed_likes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reader_activity_notifications; exception when duplicate_object then null; end;
 end if;
end $$;
