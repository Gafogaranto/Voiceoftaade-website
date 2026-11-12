revoke all on function public.review_book_club_application(uuid,text) from public,anon;
grant execute on function public.review_book_club_application(uuid,text) to authenticated;
revoke all on function public.create_book_club_request(text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.create_book_club_request(text,text,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.create_book_club_request(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_book_club_request(text,text,text,text,text,text,text,text,text) to authenticated;