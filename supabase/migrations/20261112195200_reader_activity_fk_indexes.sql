create index if not exists reader_activity_actor_idx on public.reader_activity_notifications(actor_id);
create index if not exists reader_activity_post_idx on public.reader_activity_notifications(post_id);
create index if not exists reader_activity_comment_idx on public.reader_activity_notifications(comment_id);