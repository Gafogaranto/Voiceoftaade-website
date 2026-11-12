revoke all on table public.reader_feed_echoes from public,anon,authenticated;
grant select on table public.reader_feed_echoes to anon,authenticated;
grant insert,delete on table public.reader_feed_echoes to authenticated;