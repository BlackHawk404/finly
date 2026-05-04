-- Finly: cloud sync schema
-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run)

-- ---------- Tables ----------

create table if not exists public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount numeric not null,
  currency text not null,
  category_id text not null,
  description text not null default '',
  date date not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'upi', 'bank', 'other')),
  source text not null check (source in ('manual', 'voice')),
  raw_transcript text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists expenses_user_updated_idx on public.expenses (user_id, updated_at desc);
create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  monthly_limit numeric not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, category_id)
);

create table if not exists public.khata (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lent', 'borrowed')),
  person_name text not null,
  amount numeric not null,
  currency text not null,
  date date not null,
  description text not null default '',
  status text not null check (status in ('pending', 'settled')),
  settled_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists khata_user_updated_idx on public.khata (user_id, updated_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  default_payment_method text not null default 'cash',
  language text not null default 'en-US',
  user_name text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------

alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.khata enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users manage own expenses" on public.expenses;
create policy "Users manage own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own budgets" on public.budgets;
create policy "Users manage own budgets" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own khata" on public.khata;
create policy "Users manage own khata" on public.khata
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
