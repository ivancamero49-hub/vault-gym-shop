
-- ============ ENUMS ============
create type public.app_role as enum ('user', 'gym_owner', 'admin');
create type public.plan_tier as enum ('bronce', 'plata', 'oro');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  base_gym_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ USER ROLES (separate table) ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ============ GYMS ============
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  description text,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  level smallint not null default 1 check (level between 1 and 3),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.gyms enable row level security;

alter table public.profiles
  add constraint profiles_base_gym_fk foreign key (base_gym_id) references public.gyms(id) on delete set null;

-- ============ PLANS ============
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  tier public.plan_tier not null unique,
  name text not null,
  monthly_credits integer not null,
  max_gym_level smallint not null check (max_gym_level between 1 and 3),
  price_cents integer not null default 0,
  active boolean not null default true
);
alter table public.plans enable row level security;

insert into public.plans (tier, name, monthly_credits, max_gym_level, price_cents) values
  ('bronce', 'Bronce', 20, 1, 1900),
  ('plata',  'Plata',  40, 2, 3500),
  ('oro',    'Oro',    80, 3, 5900);

-- ============ SUBSCRIPTIONS ============
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'active' check (status in ('active','canceled','past_due')),
  current_period_start date not null default date_trunc('month', now())::date,
  current_period_end date not null default (date_trunc('month', now()) + interval '1 month - 1 day')::date,
  created_at timestamptz not null default now(),
  unique (user_id, current_period_start)
);
alter table public.subscriptions enable row level security;

-- ============ CREDIT LEDGER ============
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, -- positive = grant, negative = spend
  reason text not null check (reason in ('grant','checkin','reservation','shop','expire','refund','adjust')),
  ref_id uuid,
  period_start date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);
alter table public.credit_ledger enable row level security;

create index credit_ledger_user_period_idx on public.credit_ledger(user_id, period_start);

-- balance view (current period)
create or replace view public.v_credit_balance as
select user_id,
       period_start,
       coalesce(sum(amount),0)::int as balance
from public.credit_ledger
group by user_id, period_start;

-- ============ TRIGGERS ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============ RLS POLICIES ============
-- profiles
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles admin read" on public.profiles for select using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "roles self read" on public.user_roles for select using (auth.uid() = user_id);
create policy "roles admin all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- gyms
create policy "gyms public read" on public.gyms for select using (active = true);
create policy "gyms owner manage" on public.gyms for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "gyms admin manage" on public.gyms for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- plans
create policy "plans public read" on public.plans for select using (active = true);
create policy "plans admin manage" on public.plans for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- subscriptions
create policy "subs self read" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subs self insert" on public.subscriptions for insert with check (auth.uid() = user_id);

-- credit_ledger (read only for users; writes via server)
create policy "ledger self read" on public.credit_ledger for select using (auth.uid() = user_id);
create policy "ledger admin all" on public.credit_ledger for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ============ SEED a few gyms ============
insert into public.gyms (name, description, address, lat, lng, level, photo_url) values
  ('Iron Vault Studio',     'Premium boutique gym',          'Polanco 123, CDMX',     19.4326, -99.1903, 3, null),
  ('Knockout Boxing Club',  'Boxing & combat training',      'Roma Norte 45, CDMX',   19.4194, -99.1607, 2, null),
  ('Forge Functional',      'Crossfit & functional fitness', 'Condesa 88, CDMX',      19.4115, -99.1735, 1, null);
