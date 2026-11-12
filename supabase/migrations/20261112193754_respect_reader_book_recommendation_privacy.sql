drop policy if exists "Readers view permitted profile books" on public.reader_profile_books;
create policy "Readers view permitted profile books" on public.reader_profile_books for select to anon,authenticated
using(
 user_id=(select auth.uid())
 or (
  public.can_view_reader_profile(user_id)
  and exists(
   select 1 from public.reader_profile_privacy v
   where v.user_id=reader_profile_books.user_id
    and (
     (reader_profile_books.item_type='favourite' and v.favourite_books_visibility in ('public','community'))
     or (reader_profile_books.item_type='recommendation' and v.recommendations_visibility in ('public','community'))
    )
  )
 )
);