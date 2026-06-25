-- WorkTracker — Multi-user migration (additive, safe to run on live data)
-- Adds authentication-based ownership: profiles table + RLS, projects.user_id.
-- Run this once in the Supabase SQL Editor AFTER the two accounts already
-- exist in Authentication > Users:
--   manu.abhiram@gmail.com  -> becomes admin
--   dmaid20@gmail.com       -> becomes the owner of all existing projects

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin', 'member')),
  status     text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

-- ── projects: add ownership column ──────────────────────────────────────────
alter table public.projects add column if not exists user_id uuid references auth.users(id);

-- Backfill all existing (currently un-owned) projects to dmaid20@gmail.com
update public.projects
set user_id = (select id from auth.users where email = 'dmaid20@gmail.com')
where user_id is null;

-- Lock it down now that every row has an owner
alter table public.projects alter column user_id set not null;

create index if not exists projects_user_id_idx on public.projects(user_id);

-- ── seed the two accounts as profiles ───────────────────────────────────────
insert into public.profiles (id, email, role, status)
select id, email, 'admin', 'active' from auth.users where email = 'manu.abhiram@gmail.com'
on conflict (id) do nothing;

insert into public.profiles (id, email, role, status)
select id, email, 'member', 'active' from auth.users where email = 'dmaid20@gmail.com'
on conflict (id) do nothing;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- NOTE: role/status checks use SECURITY DEFINER helper functions rather than
-- inline subqueries against `profiles` from within `profiles`' own policies.
-- A self-referential subquery there causes "infinite recursion detected in
-- policy for relation profiles" in Postgres — these functions run with
-- elevated privileges that bypass RLS internally, breaking the recursion.

create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_payments enable row level security;

-- profiles: see your own row, or every row if you're an active admin
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_active_admin());

-- profiles: a freshly signed-up user can create their own profile row
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- profiles: only active admins can edit other people's profiles (suspend/unsuspend)
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_active_admin());

-- profiles: only active admins can delete a member's profile
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_active_admin());

-- projects: owners manage their own data, but only while their account is active
create policy "projects_owner_active" on public.projects
  for all using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

-- projects: active admins can delete (but never read/update) anyone's projects.
-- This is what lets "Delete member" wipe their data without ever granting the
-- admin read access to project content.
create policy "projects_admin_delete" on public.projects
  for delete using (public.is_active_admin());

-- project_phases: scoped through the parent project's owner
create policy "phases_owner_active" on public.project_phases
  for all using (
    exists (select 1 from public.projects pr where pr.id = project_phases.project_id and pr.user_id = auth.uid())
    and public.is_active_user()
  )
  with check (
    exists (select 1 from public.projects pr where pr.id = project_phases.project_id and pr.user_id = auth.uid())
    and public.is_active_user()
  );

create policy "phases_admin_delete" on public.project_phases
  for delete using (public.is_active_admin());

-- project_payments: same pattern
create policy "payments_owner_active" on public.project_payments
  for all using (
    exists (select 1 from public.projects pr where pr.id = project_payments.project_id and pr.user_id = auth.uid())
    and public.is_active_user()
  )
  with check (
    exists (select 1 from public.projects pr where pr.id = project_payments.project_id and pr.user_id = auth.uid())
    and public.is_active_user()
  );

create policy "payments_admin_delete" on public.project_payments
  for delete using (public.is_active_admin());
