alter table public.profiles
  add column offers text not null default '',
  add column creates text not null default '',
  add column intention text not null default '';

revoke select on public.profiles from anon, authenticated;
grant select (
  id,
  slug,
  name,
  roles,
  location,
  bio,
  offers,
  looking_for,
  creates,
  links,
  contact,
  photo_path,
  status,
  invited_by,
  created_at
) on public.profiles to anon, authenticated;

drop function public.submit_invited_profile(text, text, text, text[], text, text, text, text[], text, text);

create function public.submit_invited_profile(
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
  if coalesce(nullif(trim(p_intention), ''), '') = '' then
    raise exception 'Profile intention is required';
  end if;

  insert into public.profiles (
    id,
    slug,
    name,
    roles,
    location,
    bio,
    offers,
    looking_for,
    creates,
    intention,
    links,
    contact,
    photo_path,
    status,
    invited_by
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
    v_invite.created_by
  );

  update public.invites
  set used_by = v_profile_id, used_at = now()
  where id = v_invite.id;

  return v_profile_id;
end;
$$;

create function public.get_profile_intentions(p_profile_ids uuid[])
returns table (profile_id uuid, intention text)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select p.id, p.intention
  from public.profiles as p
  where p.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
    and (p.id = auth.uid() or private.is_roles_admin());
$$;

create function public.get_live_profile_inviters(p_profile_ids uuid[])
returns table (profile_id uuid, inviter_name text, inviter_slug text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select target.id, inviter.name, inviter.slug
  from public.profiles as target
  join public.profiles as inviter on inviter.id = target.invited_by
  where target.id = any(coalesce(p_profile_ids, '{}'::uuid[]))
    and target.status = 'live';
$$;

revoke all on function public.submit_invited_profile(
  text, text, text, text[], text, text, text, text, text, text, text[], text, text
) from public;
revoke all on function public.get_profile_intentions(uuid[]) from public;
revoke all on function public.get_live_profile_inviters(uuid[]) from public;
grant execute on function public.submit_invited_profile(
  text, text, text, text[], text, text, text, text, text, text, text[], text, text
) to authenticated;
grant execute on function public.get_profile_intentions(uuid[]) to authenticated;
grant execute on function public.get_live_profile_inviters(uuid[]) to anon, authenticated;
