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
  profession text not null default '',
  employer text not null default '',
  monthly_income numeric not null default 0,
  monthly_income_currency text not null default '',
  financial_goal text not null default '',
  bio text not null default '',
  updated_at timestamptz not null default now()
);

-- Idempotent migration for projects created before profile fields existed.
alter table public.user_settings add column if not exists profession text not null default '';
alter table public.user_settings add column if not exists employer text not null default '';
alter table public.user_settings add column if not exists monthly_income numeric not null default 0;
alter table public.user_settings add column if not exists monthly_income_currency text not null default '';
alter table public.user_settings add column if not exists financial_goal text not null default '';
alter table public.user_settings add column if not exists bio text not null default '';

-- ---------- Investments ----------

create table if not exists public.investments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('stock', 'crypto', 'mutual_fund', 'gold', 'other')),
  symbol text not null,
  name text not null default '',
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  price_per_unit numeric not null,
  fees numeric not null default 0,
  currency text not null,
  date date not null,
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists investments_user_updated_idx on public.investments (user_id, updated_at desc);
create index if not exists investments_user_holding_idx on public.investments (user_id, asset_type, symbol);

create table if not exists public.holding_prices (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  price_per_unit numeric not null,
  currency text not null,
  as_of timestamptz not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, key)
);

alter table public.investments enable row level security;
alter table public.holding_prices enable row level security;

drop policy if exists "Users manage own investments" on public.investments;
create policy "Users manage own investments" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own holding prices" on public.holding_prices;
create policy "Users manage own holding prices" on public.holding_prices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
