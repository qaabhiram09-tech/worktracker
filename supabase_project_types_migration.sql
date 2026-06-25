-- WorkTracker — Per-account custom Project Types (additive, safe to run on live data)
-- Lets each account define its own project types, each with its own build-
-- timeline phases and its own payment-milestone split (previously a single
-- hardcoded list shared by everyone). Migrates dmaid20@gmail.com's existing
-- 16 real projects onto matching new type rows so nothing breaks.

-- ── project_types ────────────────────────────────────────────────────────────
create table public.project_types (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  price      numeric(12,2) not null default 0,
  color      text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create index project_types_user_id_idx on public.project_types(user_id);

-- ── project_type_phases (the build-timeline template for a type) ───────────
create table public.project_type_phases (
  id              uuid primary key default gen_random_uuid(),
  project_type_id uuid not null references public.project_types(id) on delete cascade,
  position        int not null,
  name            text not null,
  days            int not null
);

create index project_type_phases_type_id_idx on public.project_type_phases(project_type_id);

-- ── project_type_milestones (the payment-split template for a type) ────────
create table public.project_type_milestones (
  id              uuid primary key default gen_random_uuid(),
  project_type_id uuid not null references public.project_types(id) on delete cascade,
  position        int not null,
  label           text not null,
  icon            text,
  pct             numeric(5,2) not null
);

create index project_type_milestones_type_id_idx on public.project_type_milestones(project_type_id);

-- ── projects: link to a type (nullable until backfilled below) ─────────────
-- No ON DELETE CASCADE/SET NULL on purpose: deleting a type that's still used
-- by a real project is blocked (RESTRICT), surfaced as a clear error in the UI
-- rather than silently orphaning project data.
alter table public.projects add column if not exists project_type_id uuid references public.project_types(id);

-- ── Row Level Security (owner-only; reuses is_active_user() from the auth migration) ──
alter table public.project_types enable row level security;
alter table public.project_type_phases enable row level security;
alter table public.project_type_milestones enable row level security;

create policy "types_owner_active" on public.project_types
  for all using (auth.uid() = user_id and public.is_active_user())
  with check (auth.uid() = user_id and public.is_active_user());

create policy "type_phases_owner_active" on public.project_type_phases
  for all using (
    exists (select 1 from public.project_types pt where pt.id = project_type_phases.project_type_id and pt.user_id = auth.uid())
    and public.is_active_user()
  )
  with check (
    exists (select 1 from public.project_types pt where pt.id = project_type_phases.project_type_id and pt.user_id = auth.uid())
    and public.is_active_user()
  );

create policy "type_milestones_owner_active" on public.project_type_milestones
  for all using (
    exists (select 1 from public.project_types pt where pt.id = project_type_milestones.project_type_id and pt.user_id = auth.uid())
    and public.is_active_user()
  )
  with check (
    exists (select 1 from public.project_types pt where pt.id = project_type_milestones.project_type_id and pt.user_id = auth.uid())
    and public.is_active_user()
  );

-- ── One-time migration: turn dmaid20's existing (type, custom_label) values ──
-- ── into real, editable project_types rows, and point their 16 projects at them ──
do $$
declare
  v_user_id uuid;
  v_type_id uuid;
  v_combo record;
begin
  select id into v_user_id from auth.users where email = 'dmaid20@gmail.com';
  if v_user_id is null then
    raise exception 'dmaid20@gmail.com not found in auth.users — create the account before running this migration';
  end if;

  for v_combo in (
    select distinct type, custom_label,
      case when type = 'custom' then custom_label
           when type = 'cms' then 'CMS'
           when type = 'woocommerce' then 'WooCommerce (Guest Checkout)'
           when type = 'shopify' then 'Shopify'
           when type = 'html' then 'HTML Website'
           when type = 'adv_ecommerce' then 'Advanced Ecommerce (User Accts)'
           else type end as label,
      case when type = 'custom' then '#ec4899'
           when type = 'cms' then '#6366f1'
           when type = 'woocommerce' then '#7c3aed'
           when type = 'shopify' then '#0891b2'
           when type = 'html' then '#059669'
           when type = 'adv_ecommerce' then '#0284c7'
           else '#6366f1' end as color
    from public.projects
    where user_id = v_user_id and project_type_id is null
  )
  loop
    insert into public.project_types (user_id, label, price, color)
    values (v_user_id, v_combo.label, 5000, v_combo.color)
    returning id into v_type_id;

    insert into public.project_type_phases (project_type_id, position, name, days) values
      (v_type_id, 0, 'Design', 2),
      (v_type_id, 1, 'Corrections', 2),
      (v_type_id, 2, 'Development', 2),
      (v_type_id, 3, 'Bug Fix & Live', 1);

    insert into public.project_type_milestones (project_type_id, position, label, icon, pct) values
      (v_type_id, 0, 'Advance', '🔑', 20),
      (v_type_id, 1, 'After Design', '🎨', 20),
      (v_type_id, 2, 'After Live', '🚀', 60);

    update public.projects
    set project_type_id = v_type_id
    where user_id = v_user_id
      and type = v_combo.type
      and coalesce(custom_label, '') = coalesce(v_combo.custom_label, '')
      and project_type_id is null;
  end loop;
end $$;

-- Sanity check: every one of dmaid20's projects must now have a type before locking the column.
do $$
declare
  v_missing int;
begin
  select count(*) into v_missing
  from public.projects pr
  join auth.users u on u.id = pr.user_id
  where u.email = 'dmaid20@gmail.com' and pr.project_type_id is null;

  if v_missing > 0 then
    raise exception '% of dmaid20''s projects still have no project_type_id — investigate before locking the column', v_missing;
  end if;
end $$;

-- Safe globally right now: every other account currently has zero projects.
alter table public.projects alter column project_type_id set not null;

-- The legacy `type` column (text) was NOT NULL from the original schema, but
-- new projects no longer populate it — only project_type_id matters now.
alter table public.projects alter column type drop not null;
