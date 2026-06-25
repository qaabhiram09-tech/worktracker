-- WorkTracker — Supabase schema (open access, no auth)
-- Paste this whole file into Supabase SQL Editor and run it.
-- NOTE: RLS is left disabled here since the app has no login — anyone with
-- the project's anon key (which ships in the public frontend bundle) can
-- read/write this data. That's an explicit, accepted tradeoff for a
-- single-user personal tool, not an oversight.

create extension if not exists "pgcrypto";

drop table if exists public.project_payments;
drop table if exists public.project_phases;
drop table if exists public.projects;

-- ── projects ────────────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  client_name text not null,
  type        text not null,
  custom_label text,
  price       numeric(12,2) not null,
  start_date  date not null,
  notes       text not null default '',
  status      text not null default 'active'
              check (status in ('active', 'completed', 'on_hold')),
  created_at  timestamptz not null default now()
);

-- ── project_phases (build timeline) ─────────────────────────────────────────
create table public.project_phases (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  position       int not null,
  name           text not null,
  days           int not null,
  completed      boolean not null default false,
  completed_date date
);

create index project_phases_project_id_idx on public.project_phases(project_id);

-- ── project_payments (milestones) ───────────────────────────────────────────
create table public.project_payments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key        text not null,
  label      text not null,
  icon       text,
  pct        numeric(5,2) not null,
  amount     numeric(12,2) not null,
  paid       boolean not null default false,
  paid_date  date
);

create index project_payments_project_id_idx on public.project_payments(project_id);

-- Supabase auto-enables RLS on tables created via the SQL editor by default.
-- This app has no login, so explicitly turn it back off (open access, by choice).
alter table public.projects disable row level security;
alter table public.project_phases disable row level security;
alter table public.project_payments disable row level security;
