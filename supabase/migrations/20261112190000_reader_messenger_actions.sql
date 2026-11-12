-- Reader Messenger workflow RPCs
-- The schema already contains direct/group chat, status, reaction, receipt and call tables.
-- These RPCs provide authenticated write paths where RLS intentionally denies direct table writes.

create or replace function public.send_reader_chat_group_message(
  p_group_id uuid,p_body text default '',p_message_type text default 'text',
  p_attachment_path text default null,p_attachment_name text default null,
  p_attachment_mime text default null,p_attachment_size bigint default null,p_reply_to uuid default null
) returns uuid language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); message_id uuid; parent_group uuid;
begin
  if actor is null or not public.is_reader_chat_group_member(p_group_id,actor) then raise exception 'You are not a member of this group.'; end if;
  if p_message_type not in ('text','image','video','audio','voice','file') then raise exception 'Unsupported message type.'; end if;
  if char_length(coalesce(p_body,''))>4000 then raise exception 'Messages cannot exceed 4,000 characters.'; end if;
  if p_attachment_size is not null and (p_attachment_size<=0 or p_attachment_size>15728640) then raise exception 'Attachments must be 15 MB or smaller.'; end if;
  if coalesce(char_length(btrim(p_body)),0)=0 and p_attachment_path is null then raise exception 'Write a message or attach a file.'; end if;
  if exists(select 1 from public.reader_chat_group_members m join public.reader_blocks b on
    (b.blocker_id=actor and b.blocked_id=m.user_id) or (b.blocker_id=m.user_id and b.blocked_id=actor)
    where m.group_id=p_group_id and m.user_id<>actor) then raise exception 'Messaging is unavailable with a member of this group.'; end if;
  if p_attachment_path is not null and p_attachment_path !~ ('^group/'||p_group_id::text||'/'||actor::text||'/') then raise exception 'Attachment path is not valid for this group.'; end if;
  if p_reply_to is not null then select group_id into parent_group from public.reader_chat_group_messages where id=p_reply_to;if parent_group is distinct from p_group_id then raise exception 'The reply target is not in this group.';end if;end if;
  insert into public.reader_chat_group_messages(group_id,sender_id,body,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,reply_to)
  values(p_group_id,actor,coalesce(p_body,''),p_message_type,p_attachment_path,p_attachment_name,p_attachment_mime,p_attachment_size,p_reply_to)
  returning id into message_id;return message_id;
end;$$;

create or replace function public.update_reader_chat_message(p_message_id uuid,p_thread_type text,p_action text,p_body text default null)
returns boolean language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); row_sender uuid; parent_id uuid; created timestamptz; group_admin boolean;
begin
  if actor is null then raise exception 'Sign in to manage messages.';end if;
  if p_thread_type='direct' then
    select m.sender_id,m.conversation_id,m.created_at into row_sender,parent_id,created from public.reader_messages m where m.id=p_message_id;
    if not found or not public.is_reader_chat_conversation_participant(parent_id,actor) then raise exception 'Message not found.';end if;
    if p_action in('edit','delete') and row_sender<>actor then raise exception 'You can only edit or delete your own messages.';end if;
    if p_action='edit' then
      if created<now()-interval '15 minutes' then raise exception 'Messages can only be edited for 15 minutes.';end if;
      if char_length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Edited messages must contain 1–4,000 characters.';end if;
      update public.reader_messages set body=btrim(p_body),edited_at=now() where id=p_message_id;
    elsif p_action='delete' then
      if created<now()-interval '60 minutes' then raise exception 'This message is too old to delete for everyone.';end if;
      update public.reader_messages set deleted_at=now(),body='' where id=p_message_id;
    elsif p_action='pin' then update public.reader_messages set pinned_at=now() where id=p_message_id;
    elsif p_action='unpin' then update public.reader_messages set pinned_at=null where id=p_message_id;
    else raise exception 'Unsupported message action.';end if;
  elsif p_thread_type='group' then
    select m.sender_id,m.group_id,m.created_at into row_sender,parent_id,created from public.reader_chat_group_messages m where m.id=p_message_id;
    if not found or not public.is_reader_chat_group_member(parent_id,actor) then raise exception 'Message not found.';end if;
    group_admin:=public.is_reader_chat_group_admin(parent_id,actor);
    if p_action in('edit','delete') and row_sender<>actor then raise exception 'You can only edit or delete your own messages.';end if;
    if p_action in('pin','unpin') and not group_admin then raise exception 'Only group admins can pin messages.';end if;
    if p_action='edit' then
      if created<now()-interval '15 minutes' then raise exception 'Messages can only be edited for 15 minutes.';end if;
      if char_length(btrim(coalesce(p_body,''))) not between 1 and 4000 then raise exception 'Edited messages must contain 1–4,000 characters.';end if;
      update public.reader_chat_group_messages set body=btrim(p_body),edited_at=now() where id=p_message_id;
    elsif p_action='delete' then
      if created<now()-interval '60 minutes' then raise exception 'This message is too old to delete for everyone.';end if;
      update public.reader_chat_group_messages set deleted_at=now(),body='' where id=p_message_id;
    elsif p_action='pin' then update public.reader_chat_group_messages set pinned_at=now() where id=p_message_id;
    elsif p_action='unpin' then update public.reader_chat_group_messages set pinned_at=null where id=p_message_id;
    else raise exception 'Unsupported message action.';end if;
  else raise exception 'Unsupported conversation type.';end if;
  return true;
end;$$;

create or replace function public.mark_reader_messages_read(p_conversation_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();changed integer;
begin
  if actor is null or not public.is_reader_chat_conversation_participant(p_conversation_id,actor) then raise exception 'Conversation not found.';end if;
  update public.reader_messages set delivered_at=coalesce(delivered_at,now()),read_at=coalesce(read_at,now()) where conversation_id=p_conversation_id and sender_id<>actor and read_at is null;
  get diagnostics changed=row_count;return changed;
end;$$;

create or replace function public.mark_reader_chat_group_read(p_group_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();changed integer;
begin
  if actor is null or not public.is_reader_chat_group_member(p_group_id,actor) then raise exception 'Group not found.';end if;
  insert into public.reader_chat_group_receipts(message_id,user_id,delivered_at,read_at)
    select m.id,actor,now(),now() from public.reader_chat_group_messages m where m.group_id=p_group_id and m.sender_id<>actor
    on conflict(message_id,user_id) do update set delivered_at=coalesce(public.reader_chat_group_receipts.delivered_at,excluded.delivered_at),read_at=coalesce(public.reader_chat_group_receipts.read_at,excluded.read_at);
  get diagnostics changed=row_count;update public.reader_chat_group_members set last_read_at=now() where group_id=p_group_id and user_id=actor;return changed;
end;$$;

create or replace function public.start_reader_chat_call(p_conversation_id uuid,p_call_type text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();peer uuid;call_key uuid;
begin
  if actor is null then raise exception 'Sign in to start a call.';end if;
  if p_call_type not in('audio','video') then raise exception 'Choose an audio or video call.';end if;
  select case when user_one=actor then user_two else user_one end into peer from public.reader_conversations where id=p_conversation_id and actor in(user_one,user_two);
  if peer is null then raise exception 'Conversation not found.';end if;
  if exists(select 1 from public.reader_blocks b where(b.blocker_id=actor and b.blocked_id=peer)or(b.blocker_id=peer and b.blocked_id=actor)) then raise exception 'Calling is unavailable for this conversation.';end if;
  insert into public.reader_chat_calls(conversation_id,caller_id,recipient_id,call_type,status)values(p_conversation_id,actor,peer,p_call_type,'ringing')returning id into call_key;return call_key;
end;$$;

create or replace function public.update_reader_chat_call_status(p_call_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();c public.reader_chat_calls%rowtype;
begin
  if actor is null then raise exception 'Sign in to manage calls.';end if;
  select * into c from public.reader_chat_calls where id=p_call_id and actor in(caller_id,recipient_id) for update;
  if not found then raise exception 'Call not found.';end if;
  if p_status not in('accepted','declined','ended','missed','failed') then raise exception 'Unsupported call status.';end if;
  if p_status='accepted' and(actor<>c.recipient_id or c.status<>'ringing')then raise exception 'This call cannot be accepted.';end if;
  if p_status in('declined','missed')and actor<>c.recipient_id then raise exception 'Only the recipient can decline this call.';end if;
  update public.reader_chat_calls set status=p_status,accepted_at=case when p_status='accepted' then now() else accepted_at end,ended_at=case when p_status in('declined','ended','missed','failed')then now() else ended_at end where id=p_call_id;return true;
end;$$;

revoke all on function public.send_reader_chat_group_message(uuid,text,text,text,text,text,bigint,uuid) from anon, public;
grant execute on function public.send_reader_chat_group_message(uuid,text,text,text,text,text,bigint,uuid) to authenticated;
revoke all on function public.update_reader_chat_message(uuid,text,text,text) from anon, public;
grant execute on function public.update_reader_chat_message(uuid,text,text,text) to authenticated;
revoke all on function public.mark_reader_messages_read(uuid) from anon, public;
grant execute on function public.mark_reader_messages_read(uuid) to authenticated;
revoke all on function public.mark_reader_chat_group_read(uuid) from anon, public;
grant execute on function public.mark_reader_chat_group_read(uuid) to authenticated;
revoke all on function public.start_reader_chat_call(uuid,text) from anon, public;
grant execute on function public.start_reader_chat_call(uuid,text) to authenticated;
revoke all on function public.update_reader_chat_call_status(uuid,text) from anon, public;
grant execute on function public.update_reader_chat_call_status(uuid,text) to authenticated;

create or replace function public.remove_reader_chat_group_member(p_group_id uuid,p_target_user_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid(); target_role text;
begin
 if actor is null or not public.is_reader_chat_group_admin(p_group_id,actor) then raise exception 'Only group admins can manage members.'; end if;
 if p_target_user_id=actor then raise exception 'Use Leave group to remove yourself.'; end if;
 select role into target_role from public.reader_chat_group_members where group_id=p_group_id and user_id=p_target_user_id;
 if target_role is null then raise exception 'Member not found.'; end if;
 if target_role='admin' then raise exception 'Another admin must transfer admin rights before removal.'; end if;
 delete from public.reader_chat_group_members where group_id=p_group_id and user_id=p_target_user_id;
end;$$;
create or replace function public.update_reader_chat_group(p_group_id uuid,p_name text,p_description text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not public.is_reader_chat_group_admin(p_group_id,actor) then raise exception 'Only group admins can edit group details.'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Group names must be between 2 and 80 characters.'; end if;
 if char_length(coalesce(p_description,''))>500 then raise exception 'Group description cannot exceed 500 characters.'; end if;
 update public.reader_chat_groups set name=btrim(p_name),description=btrim(coalesce(p_description,'')),updated_at=now() where id=p_group_id;
 return true;
end;$$;
revoke execute on function public.remove_reader_chat_group_member(uuid,uuid) from anon,public;
grant execute on function public.remove_reader_chat_group_member(uuid,uuid) to authenticated;
revoke execute on function public.update_reader_chat_group(uuid,text,text) from anon,public;
grant execute on function public.update_reader_chat_group(uuid,text,text) to authenticated;
