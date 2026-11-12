alter table public.reader_feed_posts
  drop constraint if exists reader_feed_posts_body_length;
alter table public.reader_feed_posts
  add constraint reader_feed_posts_body_length
  check (
    (post_type = 'image' and char_length(btrim(body)) = 0)
    or
    (post_type in ('note','article') and char_length(btrim(body)) between 1 and 12000)
  );