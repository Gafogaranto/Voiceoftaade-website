create or replace function public.get_reader_profile_visibility(target_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare settings public.reader_profile_privacy%rowtype;
begin
 select * into settings from public.reader_profile_privacy where user_id=target_user_id;
 if not found then
  return jsonb_build_object('profile_visibility','community','reading_activity_visibility','community','favourites_visibility','community','saved_collections_visibility','community','reviews_visibility','community','allow_message_requests',true,'favourite_books_visibility','community','recommendations_visibility','community');
 end if;
 if not private.can_view_reader_profile(target_user_id) then return null; end if;
 return jsonb_build_object('profile_visibility',settings.profile_visibility,'reading_activity_visibility',settings.reading_activity_visibility,'favourites_visibility',settings.favourites_visibility,'saved_collections_visibility',settings.saved_collections_visibility,'reviews_visibility',settings.reviews_visibility,'allow_message_requests',settings.allow_message_requests,'favourite_books_visibility',settings.favourite_books_visibility,'recommendations_visibility',settings.recommendations_visibility);
end;
$$;