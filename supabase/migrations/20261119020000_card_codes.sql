-- Card codes: one shared code printed on business cards (BH144K).
-- Anyone with the code can sign up; their profile still waits as pending
-- until the Curator approves it. Each code has a use limit, an end date
-- and an on/off switch.

create table public.card_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,20}$'),
  label text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  max_uses integer not null check (max_uses between 1 and 10000),
  uses integer not null default 0 check (uses >= 0),
  active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

create table public.card_code_uses (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null references public.card_codes (code) on delete cascade,
  used_at timestamptz not null default now()
);

create index card_code_uses_code_idx on public.card_code_uses (code);

alter table public.card_codes enable row level security;
alter table public.card_code_uses enable row level security;

create policy "Admins can view card codes"
on public.card_codes for select
to authenticated
using ((select private.is_roles_admin()));

create policy "Admins can view card code uses"
on public.card_code_uses for select
to authenticated
using ((select private.is_roles_admin()));

revoke all on public.card_codes, public.card_code_uses from public, anon, authenticated;
grant select on public.card_codes, public.card_code_uses to authenticated;

create or replace function private.normalise_card_code(p_code text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

revoke all on function private.normalise_card_code(text) from public;
grant execute on function private.normalise_card_code(text) to anon, authenticated;

create or replace function private.card_code_open(p_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.card_codes
    where code = private.normalise_card_code(p_code)
      and active
      and expires_at > now()
      and uses < max_uses
  );
$$;

revoke all on function private.card_code_open(text) from public;
grant execute on function private.card_code_open(text) to anon, authenticated;

-- A personal invite or an open card code both count as a valid invitation.
create or replace function public.check_invite(p_code text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.invites
    where code = p_code
      and used_at is null
      and expires_at > now()
  ) or private.card_code_open(p_code);
$$;

create or replace function public.submit_invited_profile(
  p_code text,
  p_slug text,
  p_name text,
  p_roles text[],
  p_location text,
  p_bio text,
  p_offers text,
  p_looking_for text,
  p_creates text,
  p_intention text,
  p_links text[],
  p_contact text,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_invite public.invites%rowtype;
  v_card public.card_codes%rowtype;
  v_profile_id uuid := auth.uid();
  v_inviter uuid;
  v_is_card boolean := false;
begin
  if v_profile_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from public.invites
  where code = p_code
  for update;

  if found then
    if v_invite.used_at is not null or v_invite.expires_at <= now() then
      raise exception 'Invite is invalid, expired, or already used';
    end if;
    if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(v_invite.email) then
      raise exception 'Sign in with the email address that received this invite';
    end if;
    v_inviter := v_invite.created_by;
  else
    select * into v_card
    from public.card_codes
    where code = private.normalise_card_code(p_code)
    for update;
    if not found or not v_card.active or v_card.expires_at <= now() or v_card.uses >= v_card.max_uses then
      raise exception 'Invite is invalid, expired, or already used';
    end if;
    v_inviter := v_card.created_by;
    v_is_card := true;
  end if;

  if exists (select 1 from public.profiles where id = v_profile_id) then
    raise exception 'This account already has a profile';
  end if;
  if coalesce(nullif(trim(p_intention), ''), '') = '' then
    raise exception 'Profile intention is required';
  end if;

  insert into public.profiles (
    id, slug, name, roles, location, bio, offers, looking_for, creates,
    intention, links, contact, photo_path, status, invited_by
  ) values (
    v_profile_id,
    lower(trim(p_slug)),
    trim(p_name),
    coalesce(p_roles, '{}'),
    coalesce(trim(p_location), ''),
    coalesce(trim(p_bio), ''),
    coalesce(trim(p_offers), ''),
    coalesce(trim(p_looking_for), ''),
    coalesce(trim(p_creates), ''),
    trim(p_intention),
    coalesce(p_links, '{}'),
    coalesce(trim(p_contact), ''),
    nullif(trim(p_photo_path), ''),
    'pending',
    v_inviter
  );

  if v_is_card then
    update public.card_codes set uses = uses + 1 where code = v_card.code;
    insert into public.card_code_uses (profile_id, code) values (v_profile_id, v_card.code);
  else
    update public.invites
    set used_by = v_profile_id, used_at = now()
    where id = v_invite.id;
  end if;

  return v_profile_id;
end;
$$;

create or replace function public.create_card_code(
  p_code text,
  p_label text,
  p_max_uses integer,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_code text := private.normalise_card_code(p_code);
begin
  if not private.is_roles_admin() then
    raise exception 'Admin access required';
  end if;
  if v_code !~ '^[A-Z0-9]{4,20}$' then
    raise exception 'A card code is 4 to 20 letters or digits';
  end if;
  if exists (select 1 from public.invites where upper(code) = v_code) then
    raise exception 'That code is already in use';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'The end date must be in the future';
  end if;
  insert into public.card_codes (code, label, created_by, max_uses, expires_at)
  values (v_code, coalesce(trim(p_label), ''), auth.uid(), p_max_uses, p_expires_at);
  return v_code;
end;
$$;

create or replace function public.set_card_code_active(p_code text, p_active boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_roles_admin() then
    raise exception 'Admin access required';
  end if;
  update public.card_codes
  set active = p_active
  where code = private.normalise_card_code(p_code);
  if not found then
    raise exception 'Card code not found';
  end if;
end;
$$;

revoke all on function public.check_invite(text) from public;
revoke all on function public.submit_invited_profile(
  text, text, text, text[], text, text, text, text, text, text, text[], text, text
) from public;
revoke all on function public.create_card_code(text, text, integer, timestamptz) from public, anon;
revoke all on function public.set_card_code_active(text, boolean) from public, anon;
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function public.submit_invited_profile(
  text, text, text, text[], text, text, text, text, text, text, text[], text, text
) to authenticated;
grant execute on function public.create_card_code(text, text, integer, timestamptz) to authenticated;
grant execute on function public.set_card_code_active(text, boolean) to authenticated;

-- The code printed on the first BONHOMME business cards.
insert into public.card_codes (code, label, created_by, max_uses, expires_at)
values (
  'BH144K',
  'BONHOMME business card, first print',
  (select id from public.profiles where slug = 'bonhomme'),
  300,
  '2027-12-31 23:59:59+00'
)
on conflict (code) do nothing;
