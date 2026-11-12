-- Harden reader follow-list access. Only edges between profiles visible to the caller
-- can be read, and the API function runs as invoker rather than security definer.
drop function if exists public.get_public_reader_follow_list(uuid,text);

create or replace function public.get_public_reader_follow_list(
  target_user_id uuid,
  list_type text
)
returns table(id uuid, display_name text, avatar_url text)
language sql
stable
security invoker
set search_path = ''
as $function$
  with visible_target as (
    select p.id
    from public.get_public_reader_profile_card(target_user_id) p
    where list_type in ('followers','following')
  )
  select visible_reader.id, visible_reader.display_name, visible_reader.avatar_url
  from visible_target t
  join public.reader_follows f
    on (
      (list_type = 'followers' and f.followed_id = t.id)
      or
      (list_type = 'following' and f.follower_id = t.id)
    )
  cross join lateral public.get_public_reader_profile_card(
    case when list_type = 'followers' then f.follower_id else f.followed_id end
  ) visible_reader
  order by lower(visible_reader.display_name), visible_reader.id;
$function$;

drop policy if exists "Readers can view follow relationships" on public.reader_follows;
create policy "Readers can view visible follow relationships"
  on public.reader_follows for select to anon, authenticated
  using (
    private.can_view_reader_profile(follower_id)
    and private.can_view_reader_profile(followed_id)
  );
grant select on public.reader_follows to anon, authenticated;
revoke all on function public.get_public_reader_follow_list(uuid,text) from public, anon, authenticated;
grant execute on function public.get_public_reader_follow_list(uuid,text) to anon, authenticated;
