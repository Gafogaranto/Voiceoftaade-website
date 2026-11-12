alter table public.reader_profile_books
  add constraint reader_profile_books_url_safe
  check (book_url is null or book_url ~* '^https?://');