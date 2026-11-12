create or replace function public.get_public_reader_follow_list(
  target_user_id uuid,
  list_type text
)
returns table(id uuid, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id,
         coalesce(nullif(trim(p.display_name), ''), 'Voiceoftaade reader') as display_name,
         p.avatar_url
  from public.reader_follows f
  join public.profiles p
    on p.id = case
      when list_type = 'followers' then f.follower_id
      when list_type = 'following' then f.followed_id
      else null
    end
  where list_type in ('followers', 'following')
    and private.can_view_reader_profile(target_user_id)
    and private.can_view_reader_profile(p.id)
    and (
      (list_type = 'followers' and f.followed_id = target_user_id)
      or
      (list_type = 'following' and f.follower_id = target_user_id)
    )
  order by lower(coalesce(p.display_name, '')), p.id;
$function$;

revoke all on function public.get_public_reader_follow_list(uuid, text) from public, anon, authenticated;
grant execute on function public.get_public_reader_follow_list(uuid, text) to anon, authenticated;
