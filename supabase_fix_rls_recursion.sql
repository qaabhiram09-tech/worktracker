-- Fix: "infinite recursion detected in policy for relation profiles"
-- Cause: the profiles policies checked admin status via a subquery against
-- profiles itself, which re-triggers profiles' own RLS recursively.
-- Fix: move the role/status check into SECURITY DEFINER functions, which
-- bypass RLS internally and break the recursion.

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

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;
drop policy if exists "projects_owner_active" on public.projects;
drop policy if exists "projects_admin_delete" on public.projects;
drop policy if exists "phases_owner_active" on public.project_phases;
drop policy if exists "phases_admin_delete" on public.project_phases;
drop policy if exists "payments_owner_active" on public.project_payments;
drop policy if exists "payments_admin_delete" on public.project_payments;

create policy "profiles_select_self_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_active_admin());

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update using (public.is_active_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_active_admin());

create policy "projects_owner_active" on public.projects
  for all using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

create policy "projects_admin_delete" on public.projects
  for delete using (public.is_active_admin());

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
