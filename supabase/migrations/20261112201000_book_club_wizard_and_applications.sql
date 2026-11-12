alter table public.book_clubs alter column book_title drop not null;
alter table public.book_clubs alter column book_author drop not null;
alter table public.book_clubs add column if not exists club_type text not null default 'single-book';
alter table public.book_clubs drop constraint if exists book_clubs_club_type_check;
alter table public.book_clubs add constraint book_clubs_club_type_check check (club_type in ('single-book','open-reading'));

create or replace function public.create_book_club_request(
 p_name text,p_slug text,p_description text,p_visibility text,p_book_title text,p_book_author text,p_genre text,p_reading_plan text default ''
) returns uuid language plpgsql set search_path='' as $$
begin
 return public.create_book_club_request(p_name,p_slug,p_description,p_visibility,p_book_title,p_book_author,p_genre,p_reading_plan,'single-book');
end;
$$;
create or replace function public.create_book_club_request(
 p_name text,p_slug text,p_description text,p_visibility text,p_book_title text,p_book_author text,p_genre text,p_reading_plan text,p_club_type text
) returns uuid language plpgsql set search_path='' as $$
declare v_user_id uuid := (select auth.uid()); v_community_id uuid;
begin
 if v_user_id is null then raise exception 'Sign in before creating a book club.' using errcode='28000'; end if;
 if char_length(trim(coalesce(p_name,''))) not between 3 and 80
 or char_length(trim(coalesce(p_description,''))) not between 10 and 1000
 or (p_club_type='single-book' and (char_length(trim(coalesce(p_book_title,''))) not between 1 and 180 or char_length(trim(coalesce(p_book_author,''))) not between 1 and 120))
 or (p_club_type='open-reading' and (char_length(coalesce(p_book_title,''))>180 or char_length(coalesce(p_book_author,''))>120))
 or char_length(trim(coalesce(p_genre,''))) not between 1 and 80
 or char_length(coalesce(p_reading_plan,''))>2000
 or p_visibility not in ('public','private') or p_club_type not in ('single-book','open-reading')
 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_slug)>90 then
 raise exception 'Please check the book club details and try again.' using errcode='22023';
 end if;
 insert into public.communities(name,slug,description,visibility,created_by,status)
 values(trim(p_name),p_slug,trim(p_description),p_visibility,v_user_id,'pending') returning id into v_community_id;
 insert into public.book_clubs(community_id,book_title,book_author,genre,reading_plan,club_type)
 values(v_community_id,nullif(trim(coalesce(p_book_title,'')),''),nullif(trim(coalesce(p_book_author,'')),''),trim(p_genre),coalesce(p_reading_plan,''),p_club_type);
 return v_community_id;
end;
$$;
grant execute on function public.create_book_club_request(text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_book_club_request(text,text,text,text,text,text,text,text) to authenticated;

create table if not exists public.book_club_applications(
 id uuid primary key default gen_random_uuid(),
 community_id uuid not null references public.communities(id) on delete cascade,
 applicant_id uuid not null references auth.users(id) on delete cascade,
 answers jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 constraint book_club_applications_answers_object check(jsonb_typeof(answers)='object')
);
create unique index if not exists book_club_applications_one_pending_per_reader
 on public.book_club_applications(community_id,applicant_id) where status='pending';
alter table public.book_club_applications enable row level security;
grant select,insert on public.book_club_applications to authenticated;
create schema if not exists private;
create or replace function private.can_manage_book_club(target_community_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.communities c where c.id=target_community_id and c.created_by=auth.uid())
  or exists(select 1 from public.community_members m where m.community_id=target_community_id and m.user_id=auth.uid() and m.status='active' and m.role in ('owner','moderator'))
  or public.is_community_platform_staff()
 );
$$;
revoke all on function private.can_manage_book_club(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_book_club(uuid) to authenticated;
drop policy if exists "Applicants and club managers view applications" on public.book_club_applications;
create policy "Applicants and club managers view applications" on public.book_club_applications for select to authenticated
using(applicant_id=auth.uid() or private.can_manage_book_club(community_id));
drop policy if exists "Readers submit one pending book club application" on public.book_club_applications;
create policy "Readers submit one pending book club application" on public.book_club_applications for insert to authenticated
with check(applicant_id=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null
 and exists(select 1 from public.communities c where c.id=community_id and c.status='active')
 and not exists(select 1 from public.community_members m where m.community_id=community_id and m.user_id=auth.uid() and m.status='active'));
create or replace function public.review_book_club_application(p_application_id uuid,p_decision text)
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.book_club_applications%rowtype;
begin
 if auth.uid() is null or p_decision not in ('approved','rejected') then raise exception 'Invalid application review.' using errcode='22023'; end if;
 select * into a from public.book_club_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found.' using errcode='P0002'; end if;
 if not private.can_manage_book_club(a.community_id) then raise exception 'You cannot review applications for this club.' using errcode='42501'; end if;
 if a.status<>'pending' then raise exception 'This application has already been reviewed.' using errcode='55000'; end if;
 if p_decision='approved' then
  insert into public.community_members(community_id,user_id,role,status)
  values(a.community_id,a.applicant_id,'member','active')
  on conflict(community_id,user_id) do update set status='active',role='member',joined_at=now();
 end if;
 update public.book_club_applications set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now() where id=p_application_id;
 return true;
end;
$$;
grant execute on function public.review_book_club_application(uuid,text) to authenticated;