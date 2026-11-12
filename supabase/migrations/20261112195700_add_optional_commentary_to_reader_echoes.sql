alter table public.reader_feed_echoes add column if not exists commentary text;
alter table public.reader_feed_echoes drop constraint if exists reader_feed_echoes_commentary_length;
alter table public.reader_feed_echoes add constraint reader_feed_echoes_commentary_length check (commentary is null or char_length(commentary)<=1000);