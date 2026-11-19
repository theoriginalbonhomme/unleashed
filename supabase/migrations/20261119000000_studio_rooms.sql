-- Studio v1: split-first Unleash Rooms with file links.
-- Every write goes through a security definer function, so the rules live in one place:
-- members agree the split first, links and the next step open only after everyone signs,
-- and the log and link rows are append-only.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  created_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'drafting_split' check (status in ('drafting_split', 'active')),
  stage text not null default 'Idea' check (stage in ('Idea', 'Stems', 'Arrangement', 'Vocals', 'Mix', 'Master', 'Release')),
  next_owner uuid references public.profiles (id) on delete set null,
  next_note text not null default '' check (length(next_note) <= 280),
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default '' check (length(role) <= 60),
  percent numeric(5, 2) not null default 0 check (percent >= 0 and percent <= 100),
  accepted_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (room_id, profile_id)
);

create table public.room_links (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  added_by uuid references public.profiles (id) on delete set null,
  label text not null check (length(btrim(label)) between 1 and 120),
  url text not null check (url ~ '^https://' and length(url) <= 2048),
  kind text not null default 'other' check (kind in ('stems', 'project', 'master', 'reference', 'other')),
  note text not null default '' check (length(note) <= 280),
  created_at timestamptz not null default now()
);

create table public.room_log (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms (id) on delete cascade,
  actor uuid references public.profiles (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index rooms_created_by_idx on public.rooms (created_by);
create index room_members_profile_idx on public.room_members (profile_id);
create index room_links_room_created_idx on public.room_links (room_id, created_at desc);
create index room_log_room_created_idx on public.room_log (room_id, created_at desc);

create or replace function private.is_live_member()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'live'
  );
$$;

create or replace function private.is_room_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and profile_id = auth.uid()
  );
$$;

revoke all on function private.is_live_member() from public;
revoke all on function private.is_room_member(uuid) from public;
grant execute on function private.is_live_member() to authenticated;
grant execute on function private.is_room_member(uuid) to authenticated;

create or replace function private.block_append_only_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('unleashed.room_cascade', true) = 'on' then
    return old;
  end if;
  -- Deleting a profile sets added_by / actor to null; allow only that.
  if tg_op = 'UPDATE'
    and (to_jsonb(new) - 'added_by' - 'actor') = (to_jsonb(old) - 'added_by' - 'actor')
    and coalesce(to_jsonb(new) ->> 'added_by', to_jsonb(new) ->> 'actor') is null then
    return new;
  end if;
  raise exception '% rows are append-only', tg_table_name;
end;
$$;

create trigger room_links_append_only
before update or delete on public.room_links
for each row execute function private.block_append_only_change();

create trigger room_log_append_only
before update or delete on public.room_log
for each row execute function private.block_append_only_change();

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_links enable row level security;
alter table public.room_log enable row level security;

create policy "Room members and admins can view rooms"
on public.rooms for select
to authenticated
using ((select private.is_room_member(id)) or (select private.is_roles_admin()));

create policy "Room members and admins can view members"
on public.room_members for select
to authenticated
using ((select private.is_room_member(room_id)) or (select private.is_roles_admin()));

create policy "Room members and admins can view links"
on public.room_links for select
to authenticated
using ((select private.is_room_member(room_id)) or (select private.is_roles_admin()));

create policy "Room members and admins can view the log"
on public.room_log for select
to authenticated
using ((select private.is_room_member(room_id)) or (select private.is_roles_admin()));

revoke all on public.rooms, public.room_members, public.room_links, public.room_log from public, anon, authenticated;
grant select on public.rooms, public.room_members, public.room_links, public.room_log to authenticated;

create or replace function public.create_room(p_title text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_room uuid;
begin
  if not private.is_live_member() then
    raise exception 'Only live members can create rooms';
  end if;
  insert into public.rooms (title, created_by, next_owner)
  values (btrim(p_title), auth.uid(), auth.uid())
  returning id into v_room;
  insert into public.room_members (room_id, profile_id) values (v_room, auth.uid());
  insert into public.room_log (room_id, actor, action, detail)
  values (v_room, auth.uid(), 'created', jsonb_build_object('title', btrim(p_title)));
  return v_room;
end;
$$;

create or replace function private.require_room_creator_drafting(p_room uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room;
  if not found then
    raise exception 'Room not found';
  end if;
  if v_room.created_by is distinct from auth.uid() then
    raise exception 'Only the room creator can change members or the split';
  end if;
  if v_room.status <> 'drafting_split' then
    raise exception 'The split is signed and can no longer change';
  end if;
end;
$$;

revoke all on function private.require_room_creator_drafting(uuid) from public;

create or replace function public.add_room_member(p_room uuid, p_slug text, p_role text default '')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile uuid;
  v_name text;
begin
  perform private.require_room_creator_drafting(p_room);
  select id, name into v_profile, v_name from public.profiles
  where slug = lower(btrim(p_slug)) and status = 'live';
  if v_profile is null then
    raise exception 'No live Unleasher with that profile address';
  end if;
  if exists (select 1 from public.room_members where room_id = p_room and profile_id = v_profile) then
    raise exception 'That Unleasher is already in the room';
  end if;
  if (select count(*) from public.room_members where room_id = p_room) >= 6 then
    raise exception 'A room holds at most six Unleashers';
  end if;
  insert into public.room_members (room_id, profile_id, role) values (p_room, v_profile, left(btrim(coalesce(p_role, '')), 60));
  update public.room_members set accepted_at = null where room_id = p_room;
  insert into public.room_log (room_id, actor, action, detail)
  values (p_room, auth.uid(), 'member_added', jsonb_build_object('name', v_name));
end;
$$;

create or replace function public.remove_room_member(p_room uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_name text;
begin
  perform private.require_room_creator_drafting(p_room);
  if p_profile = auth.uid() then
    raise exception 'The room creator cannot leave the room';
  end if;
  select name into v_name from public.profiles where id = p_profile;
  delete from public.room_members where room_id = p_room and profile_id = p_profile;
  if not found then
    raise exception 'That Unleasher is not in the room';
  end if;
  update public.room_members set accepted_at = null where room_id = p_room;
  insert into public.room_log (room_id, actor, action, detail)
  values (p_room, auth.uid(), 'member_removed', jsonb_build_object('name', coalesce(v_name, '')));
end;
$$;

-- p_splits: [{"profile_id": "...", "percent": 60, "role": "Producer"}, ...]
create or replace function public.set_room_split(p_room uuid, p_splits jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_item jsonb;
  v_percent numeric;
begin
  perform private.require_room_creator_drafting(p_room);
  if jsonb_typeof(p_splits) <> 'array' then
    raise exception 'The split must be a list';
  end if;
  for v_item in select * from jsonb_array_elements(p_splits) loop
    v_percent := (v_item ->> 'percent')::numeric;
    if v_percent is null or v_percent < 0 or v_percent > 100 then
      raise exception 'Each share must be between 0 and 100';
    end if;
    update public.room_members
    set percent = round(v_percent, 2),
        role = left(btrim(coalesce(v_item ->> 'role', role)), 60)
    where room_id = p_room and profile_id = (v_item ->> 'profile_id')::uuid;
    if not found then
      raise exception 'Everyone in the split must be in the room';
    end if;
  end loop;
  update public.room_members set accepted_at = null where room_id = p_room;
  insert into public.room_log (room_id, actor, action, detail)
  values (p_room, auth.uid(), 'split_changed', jsonb_build_object('total', (select sum(percent) from public.room_members where room_id = p_room)));
end;
$$;

create or replace function public.accept_room_split(p_room uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_status text;
  v_total numeric;
  v_count int;
begin
  select status into v_status from public.rooms where id = p_room for update;
  if v_status is null or not private.is_room_member(p_room) then
    raise exception 'Room not found';
  end if;
  if v_status <> 'drafting_split' then
    raise exception 'The split is already signed';
  end if;
  select coalesce(sum(percent), 0), count(*) into v_total, v_count from public.room_members where room_id = p_room;
  if v_count < 2 then
    raise exception 'An unleash needs at least two Unleashers';
  end if;
  if v_total <> 100 then
    raise exception 'The split must add up to exactly 100%%';
  end if;
  update public.room_members set accepted_at = now()
  where room_id = p_room and profile_id = auth.uid() and accepted_at is null;
  if found then
    insert into public.room_log (room_id, actor, action) values (p_room, auth.uid(), 'split_accepted');
  end if;
  if not exists (select 1 from public.room_members where room_id = p_room and accepted_at is null) then
    update public.rooms set status = 'active', signed_at = now() where id = p_room;
    insert into public.room_log (room_id, actor, action, detail)
    values (p_room, auth.uid(), 'split_signed', (
      select jsonb_build_object('split', jsonb_agg(jsonb_build_object('name', p.name, 'role', m.role, 'percent', m.percent) order by m.percent desc))
      from public.room_members m join public.profiles p on p.id = m.profile_id
      where m.room_id = p_room
    ));
    return 'active';
  end if;
  return 'drafting_split';
end;
$$;

create or replace function public.add_room_link(p_room uuid, p_label text, p_url text, p_kind text default 'other', p_note text default '')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_room_member(p_room) then
    raise exception 'Room not found';
  end if;
  if (select status from public.rooms where id = p_room) <> 'active' then
    raise exception 'Files open once everyone has signed the split';
  end if;
  insert into public.room_links (room_id, added_by, label, url, kind, note)
  values (p_room, auth.uid(), btrim(p_label), btrim(p_url), coalesce(nullif(p_kind, ''), 'other'), btrim(coalesce(p_note, '')));
  insert into public.room_log (room_id, actor, action, detail)
  values (p_room, auth.uid(), 'link_added', jsonb_build_object('label', btrim(p_label), 'kind', coalesce(nullif(p_kind, ''), 'other')));
end;
$$;

create or replace function public.set_room_next_step(p_room uuid, p_stage text, p_next_owner uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_room_member(p_room) then
    raise exception 'Room not found';
  end if;
  if (select status from public.rooms where id = p_room) <> 'active' then
    raise exception 'The workflow opens once everyone has signed the split';
  end if;
  if p_next_owner is not null and not exists (
    select 1 from public.room_members where room_id = p_room and profile_id = p_next_owner
  ) then
    raise exception 'The next owner must be in the room';
  end if;
  update public.rooms
  set stage = p_stage, next_owner = p_next_owner, next_note = btrim(coalesce(p_note, ''))
  where id = p_room;
  insert into public.room_log (room_id, actor, action, detail)
  values (p_room, auth.uid(), 'next_step', jsonb_build_object(
    'stage', p_stage,
    'owner', (select name from public.profiles where id = p_next_owner),
    'note', btrim(coalesce(p_note, ''))
  ));
end;
$$;

-- Deleting a room (admin only, from the dashboard) must still clear its append-only rows.
create or replace function private.allow_room_cascade()
returns trigger
language plpgsql
as $$
begin
  perform set_config('unleashed.room_cascade', 'on', true);
  return old;
end;
$$;

create trigger rooms_allow_cascade
before delete on public.rooms
for each row execute function private.allow_room_cascade();

revoke all on function public.create_room(text) from public, anon;
revoke all on function public.add_room_member(uuid, text, text) from public, anon;
revoke all on function public.remove_room_member(uuid, uuid) from public, anon;
revoke all on function public.set_room_split(uuid, jsonb) from public, anon;
revoke all on function public.accept_room_split(uuid) from public, anon;
revoke all on function public.add_room_link(uuid, text, text, text, text) from public, anon;
revoke all on function public.set_room_next_step(uuid, text, uuid, text) from public, anon;

grant execute on function public.create_room(text) to authenticated;
grant execute on function public.add_room_member(uuid, text, text) to authenticated;
grant execute on function public.remove_room_member(uuid, uuid) to authenticated;
grant execute on function public.set_room_split(uuid, jsonb) to authenticated;
grant execute on function public.accept_room_split(uuid) to authenticated;
grant execute on function public.add_room_link(uuid, text, text, text, text) to authenticated;
grant execute on function public.set_room_next_step(uuid, text, uuid, text) to authenticated;
