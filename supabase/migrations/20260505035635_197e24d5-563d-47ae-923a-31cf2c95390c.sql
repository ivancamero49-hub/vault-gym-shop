
-- reservations
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  slot_start timestamptz not null,
  credits_cost int not null default 1,
  status text not null default 'booked', -- booked|used|cancelled|expired
  created_at timestamptz not null default now()
);
create index reservations_user_idx on public.reservations(user_id, slot_start desc);
create index reservations_gym_idx on public.reservations(gym_id, slot_start desc);

alter table public.reservations enable row level security;
create policy "res self read" on public.reservations for select using (auth.uid() = user_id);
create policy "res self insert" on public.reservations for insert with check (auth.uid() = user_id);
create policy "res self update" on public.reservations for update using (auth.uid() = user_id);
create policy "res owner read" on public.reservations for select using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "res admin all" on public.reservations for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- check_ins (visitas)
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  reservation_id uuid references public.reservations(id),
  created_at timestamptz not null default now()
);
create index check_ins_gym_idx on public.check_ins(gym_id, created_at desc);
create index check_ins_user_idx on public.check_ins(user_id, created_at desc);

alter table public.check_ins enable row level security;
create policy "ci self read" on public.check_ins for select using (auth.uid() = user_id);
create policy "ci owner read" on public.check_ins for select using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "ci admin all" on public.check_ins for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  price_credits int not null default 0,
  price_cash_cents int not null default 0,
  stock int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_gym_idx on public.products(gym_id);

alter table public.products enable row level security;
create policy "prod public read" on public.products for select using (active = true);
create policy "prod owner manage" on public.products for all using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
) with check (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "prod admin all" on public.products for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  gym_id uuid references public.gyms(id),
  total_credits int not null default 0,
  total_cash_cents int not null default 0,
  status text not null default 'pending', -- pending|picked_up|cancelled
  pickup_code text not null,
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_gym_idx on public.orders(gym_id, created_at desc);

alter table public.orders enable row level security;
create policy "ord self read" on public.orders for select using (auth.uid() = user_id);
create policy "ord owner read" on public.orders for select using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "ord owner update" on public.orders for update using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "ord admin all" on public.orders for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- order_items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty int not null,
  unit_credits int not null default 0,
  unit_cash_cents int not null default 0
);
create index oi_order_idx on public.order_items(order_id);

alter table public.order_items enable row level security;
create policy "oi self read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "oi owner read" on public.order_items for select using (
  exists (select 1 from public.orders o join public.gyms g on g.id = o.gym_id where o.id = order_id and g.owner_id = auth.uid())
);
create policy "oi admin all" on public.order_items for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- gym_funds (fondo de inventario por gimnasio)
create table public.gym_funds (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  amount int not null,
  reason text not null, -- visit_share|order_share|adjust
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index gf_gym_idx on public.gym_funds(gym_id, created_at desc);

alter table public.gym_funds enable row level security;
create policy "gf owner read" on public.gym_funds for select using (
  exists (select 1 from public.gyms g where g.id = gym_id and g.owner_id = auth.uid())
);
create policy "gf admin all" on public.gym_funds for all using (has_role(auth.uid(), 'admin')) with check (has_role(auth.uid(), 'admin'));

-- view: balance de fondos por gym
create or replace view public.v_gym_fund_balance with (security_invoker=on) as
select gym_id, coalesce(sum(amount),0) as balance
from public.gym_funds group by gym_id;

-- view: visitas por día
create or replace view public.v_gym_visits_daily with (security_invoker=on) as
select gym_id, date_trunc('day', created_at)::date as day, count(*)::int as visits
from public.check_ins group by gym_id, day;
