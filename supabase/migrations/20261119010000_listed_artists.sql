-- Listed (incognito) artists: the Curator lists an artist on the Artists wall with
-- name and roles only, and can send them an invite tied to that listing.
-- When they claim it and their profile goes live under the same address, the listing hides.

create table public.listed_artists (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name text not null check (length(btrim(name)) between 1 and 80),
  roles text[] not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.invites
  add column listed_slug text references public.listed_artists (slug) on delete set null;

alter table public.listed_artists enable row level security;

create policy "Listed artists are public"
on public.listed_artists for select
to anon, authenticated
using (true);

revoke all on public.listed_artists from public, anon, authenticated;
grant select (slug, name, roles, created_at) on public.listed_artists to anon, authenticated;

create or replace function public.create_listed_artist(p_name text, p_slug text, p_roles text[] default '{}')
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_slug text := lower(btrim(p_slug));
begin
  if not private.is_roles_admin() then
    raise exception 'Only the Curator can list artists';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Use lowercase letters, numbers and hyphens for the address';
  end if;
  if exists (select 1 from public.profiles where slug = v_slug) then
    raise exception 'A member already uses that address';
  end if;
  if exists (select 1 from public.listed_artists where slug = v_slug) then
    raise exception 'That artist is already listed';
  end if;
  insert into public.listed_artists (slug, name, roles, created_by)
  values (
    v_slug,
    btrim(p_name),
    coalesce((select array_agg(left(btrim(role), 40)) from unnest(p_roles) as role where btrim(role) <> ''), '{}'),
    auth.uid()
  );
  return v_slug;
end;
$$;

create or replace function public.delete_listed_artist(p_slug text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_roles_admin() then
    raise exception 'Only the Curator can remove listed artists';
  end if;
  delete from public.listed_artists where slug = lower(btrim(p_slug));
  if not found then
    raise exception 'Listed artist not found';
  end if;
end;
$$;

create or replace function public.create_listed_invite(p_slug text, p_email text)
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_slug text := lower(btrim(p_slug));
  v_email text := lower(btrim(p_email));
  v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  if not private.is_roles_admin() then
    raise exception 'Only the Curator can invite listed artists';
  end if;
  if not exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.status = 'live') then
    raise exception 'Only live members can create invites';
  end if;
  if not exists (select 1 from public.listed_artists where slug = v_slug) then
    raise exception 'Listed artist not found';
  end if;
  if exists (select 1 from public.profiles where slug = v_slug) then
    raise exception 'This artist has already claimed their profile';
  end if;
  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'A valid email address is required';
  end if;

  return query
  insert into public.invites (code, created_by, email, expires_at, listed_slug)
  values (v_code, auth.uid(), v_email, now() + interval '14 days', v_slug)
  returning invites.id, invites.code, invites.expires_at;
end;
$$;

-- Lets the join form prefill name and address for a valid invite tied to a listing.
create or replace function public.get_invite_listing(p_code text)
returns table (slug text, name text, roles text[])
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select l.slug, l.name, l.roles
  from public.invites i
  join public.listed_artists l on l.slug = i.listed_slug
  where i.code = p_code
    and i.used_at is null
    and i.expires_at > now();
$$;

revoke all on function public.create_listed_artist(text, text, text[]) from public, anon;
revoke all on function public.delete_listed_artist(text) from public, anon;
revoke all on function public.create_listed_invite(text, text) from public, anon;
revoke all on function public.get_invite_listing(text) from public;
grant execute on function public.create_listed_artist(text, text, text[]) to authenticated;
grant execute on function public.delete_listed_artist(text) to authenticated;
grant execute on function public.create_listed_invite(text, text) to authenticated;
grant execute on function public.get_invite_listing(text) to anon, authenticated;

-- Move the four incognito artists from data/artists.json into the database.
insert into public.listed_artists (slug, name, roles, created_by)
values
  ('hugo-mesi', 'Hugo Mesi', array['DJ', 'Producer'], (select id from public.profiles where slug = 'bonhomme')),
  ('illegal-p', 'iLLEGAL P', array['Producer'], (select id from public.profiles where slug = 'bonhomme')),
  ('lasse-von-mond', 'Lasse von Mond', '{}', (select id from public.profiles where slug = 'bonhomme')),
  ('lumi-von-mond', 'Lumi von Mond', '{}', (select id from public.profiles where slug = 'bonhomme'))
on conflict (slug) do nothing;
