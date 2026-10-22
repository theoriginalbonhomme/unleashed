create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (
    email = lower(btrim(email))
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
  ),
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "Anyone can subscribe"
on public.subscribers for insert
to anon, authenticated
with check (true);

create policy "Admins can read subscribers"
on public.subscribers for select
to authenticated
using ((select private.is_roles_admin()));

create policy "Admins can update subscribers"
on public.subscribers for update
to authenticated
using ((select private.is_roles_admin()))
with check ((select private.is_roles_admin()));

create policy "Admins can delete subscribers"
on public.subscribers for delete
to authenticated
using ((select private.is_roles_admin()));

grant insert (email) on public.subscribers to anon, authenticated;
grant select, update, delete on public.subscribers to authenticated;
