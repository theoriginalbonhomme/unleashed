create table public.calls (
  id text primary key default gen_random_uuid()::text,
  created_by uuid references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  date date not null default current_date,
  have text not null default '',
  need text[] not null default '{}',
  text text not null default '',
  link text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  check (link = '' or link ~ '^https://')
);

create index calls_created_by_created_at_idx on public.calls (created_by, created_at desc);
create index calls_status_created_at_idx on public.calls (status, created_at desc);

alter table public.calls enable row level security;

create policy "Open calls are public; owners and admins can view all calls"
on public.calls for select
to anon, authenticated
using (
  status = 'open'
  or created_by = (select auth.uid())
  or (select private.is_roles_admin())
);

create policy "Live members can create calls"
on public.calls for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'live'
  )
);

create policy "Call owners and admins can update calls"
on public.calls for update
to authenticated
using (created_by = (select auth.uid()) or (select private.is_roles_admin()))
with check (created_by = (select auth.uid()) or (select private.is_roles_admin()));

create policy "Admins can delete calls"
on public.calls for delete
to authenticated
using ((select private.is_roles_admin()));

revoke all on public.calls from public, anon, authenticated;
grant select on public.calls to anon, authenticated;
grant insert (created_by, title, date, have, need, text, link) on public.calls to authenticated;
grant update (title, date, have, need, text, link, status) on public.calls to authenticated;
grant delete on public.calls to authenticated;

insert into public.calls (id, created_by, title, date, have, need, text, link, status)
values (
  'open-call-people-who-breathe-music',
  (select id from public.profiles where slug = 'bonhomme' and status = 'live' limit 1),
  'Open call: people who breathe music',
  '2026-10-21',
  'Raw beats, DJ sets and old renders, waiting for the right energy.',
  array['Producer', 'DJ', 'Music & sound art', 'Anyone driven by music'],
  'Got an inspiring violin riff in Kuala Lumpur? Shoot it over and we unleash.',
  '',
  'open'
)
on conflict (id) do nothing;

create table public.demos (
  id uuid primary key default gen_random_uuid(),
  call_id text not null references public.calls (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  email text not null check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  ),
  link text not null check (
    link ~ '^https://'
    and link ~* '^https://([a-z0-9-]+\.)*(soundcloud\.com|mixcloud\.com|youtube\.com|youtu\.be|drive\.google\.com|docs\.google\.com|dropbox\.com|dropboxusercontent\.com|wetransfer\.com|we\.tl)(:[0-9]+)?([/?#]|$)'
    and length(link) <= 2048
  ),
  message text not null default '' check (length(message) <= 500),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'listened', 'replied'))
);

create index demos_call_created_at_idx on public.demos (call_id, created_at desc);

alter table public.demos enable row level security;

create policy "Anyone can send demos to open calls"
on public.demos for insert
to anon, authenticated
with check (
  status = 'new'
  and exists (
    select 1 from public.calls
    where calls.id = demos.call_id and calls.status = 'open'
  )
);

create policy "Call owners and admins can read demos"
on public.demos for select
to authenticated
using (
  exists (
    select 1 from public.calls
    where calls.id = demos.call_id
      and (calls.created_by = (select auth.uid()) or (select private.is_roles_admin()))
  )
);

create policy "Call owners and admins can update demo status"
on public.demos for update
to authenticated
using (
  exists (
    select 1 from public.calls
    where calls.id = demos.call_id
      and (calls.created_by = (select auth.uid()) or (select private.is_roles_admin()))
  )
)
with check (
  exists (
    select 1 from public.calls
    where calls.id = demos.call_id
      and (calls.created_by = (select auth.uid()) or (select private.is_roles_admin()))
  )
);

create policy "Admins can delete demos"
on public.demos for delete
to authenticated
using ((select private.is_roles_admin()));

revoke all on public.demos from public, anon, authenticated;
grant insert (call_id, name, email, link, message) on public.demos to anon, authenticated;
grant select, delete on public.demos to authenticated;
grant update (status) on public.demos to authenticated;
