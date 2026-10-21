create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  roles text[] not null default '{}',
  location text not null default '',
  bio text not null default '',
  looking_for text not null default '',
  links text[] not null default '{}',
  contact text not null default '',
  photo_path text,
  status text not null default 'pending' check (status in ('pending', 'live', 'paused')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  used_by uuid unique references public.profiles (id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (used_by is null or used_at is not null)
);

create table public.roles_admin (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create index profiles_status_created_at_idx on public.profiles (status, created_at);
create index profiles_invited_by_idx on public.profiles (invited_by);
create index invites_created_by_idx on public.invites (created_by);
create index invites_used_by_idx on public.invites (used_by);

create or replace function private.is_roles_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.roles_admin
    where user_id = auth.uid()
  );
$$;

revoke all on function private.is_roles_admin() from public;
grant execute on function private.is_roles_admin() to anon, authenticated;

create or replace function private.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if private.is_roles_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.status is distinct from old.status
    or new.invited_by is distinct from old.invited_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin can change profile status or invitation ownership';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileges
before update on public.profiles
for each row execute function private.guard_profile_privileges();

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.roles_admin enable row level security;

create policy "Live profiles are public; owners and admins can view drafts"
on public.profiles for select
to anon, authenticated
using (
  status = 'live'
  or id = (select auth.uid())
  or (select private.is_roles_admin())
);

create policy "Owners and admins can update profiles"
on public.profiles for update
to authenticated
using (id = (select auth.uid()) or (select private.is_roles_admin()))
with check (id = (select auth.uid()) or (select private.is_roles_admin()));

create policy "Admins can delete profiles"
on public.profiles for delete
to authenticated
using ((select private.is_roles_admin()));

create policy "Invite creators, invitees, and admins can view invites"
on public.invites for select
to authenticated
using (
  created_by = (select auth.uid())
  or used_by = (select auth.uid())
  or (select private.is_roles_admin())
);

create policy "Users can inspect their own admin membership"
on public.roles_admin for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_roles_admin()));

grant select on public.profiles to anon, authenticated;
grant update, delete on public.profiles to authenticated;
grant select on public.invites, public.roles_admin to authenticated;
revoke all on public.profiles, public.invites, public.roles_admin from anon;
grant select on public.profiles to anon;

create or replace function public.check_invite(p_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.invites
    where code = p_code
      and used_at is null
      and expires_at > now()
  );
$$;

create or replace function public.create_invite(p_email text)
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(trim(p_email));
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.status = 'live'
  ) then
    raise exception 'Only live members can create invites';
  end if;
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'A valid email address is required';
  end if;

  return query
  insert into public.invites (code, created_by, email, expires_at)
  values (v_code, auth.uid(), v_email, now() + interval '14 days')
  returning invites.id, invites.code, invites.expires_at;
end;
$$;

create or replace function public.submit_invited_profile(
  p_code text,
  p_slug text,
  p_name text,
  p_roles text[],
  p_location text,
  p_bio text,
  p_looking_for text,
  p_links text[],
  p_contact text,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_invite public.invites%rowtype;
  v_profile_id uuid := auth.uid();
begin
  if v_profile_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from public.invites
  where code = p_code
  for update;

  if not found or v_invite.used_at is not null or v_invite.expires_at <= now() then
    raise exception 'Invite is invalid, expired, or already used';
  end if;
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(v_invite.email) then
    raise exception 'Sign in with the email address that received this invite';
  end if;
  if exists (select 1 from public.profiles where id = v_profile_id) then
    raise exception 'This account already has a profile';
  end if;

  insert into public.profiles (
    id, slug, name, roles, location, bio, looking_for, links, contact, photo_path, status, invited_by
  ) values (
    v_profile_id,
    lower(trim(p_slug)),
    trim(p_name),
    coalesce(p_roles, '{}'),
    coalesce(trim(p_location), ''),
    coalesce(trim(p_bio), ''),
    coalesce(trim(p_looking_for), ''),
    coalesce(p_links, '{}'),
    coalesce(trim(p_contact), ''),
    nullif(trim(p_photo_path), ''),
    'pending',
    v_invite.created_by
  );

  update public.invites
  set used_by = v_profile_id, used_at = now()
  where id = v_invite.id;

  return v_profile_id;
end;
$$;

create or replace function public.admin_review_profile(p_profile_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_roles_admin() then
    raise exception 'Admin access required';
  end if;

  if p_approve then
    update public.profiles
    set status = 'live'
    where id = p_profile_id and status = 'pending';
    if not found then
      raise exception 'Pending profile not found';
    end if;
  else
    delete from public.profiles
    where id = p_profile_id and status = 'pending';
    if not found then
      raise exception 'Pending profile not found';
    end if;
  end if;
end;
$$;

revoke all on function public.check_invite(text) from public;
revoke all on function public.create_invite(text) from public;
revoke all on function public.submit_invited_profile(text, text, text, text[], text, text, text, text[], text, text) from public;
revoke all on function public.admin_review_profile(uuid, boolean) from public;
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function public.create_invite(text) to authenticated;
grant execute on function public.submit_invited_profile(text, text, text, text[], text, text, text, text[], text, text) to authenticated;
grant execute on function public.admin_review_profile(uuid, boolean) to authenticated;
