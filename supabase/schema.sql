-- Ejecutar en SQL Editor de Supabase una sola vez.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 phone text not null unique, display_name text not null default 'Usuario',
 business_name text not null default 'Mi negocio',
 role text not null default 'user' check(role in ('admin','user')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,
 name text not null check(length(trim(name))>0),category text not null default '',
 cost numeric(14,2) not null default 0 check(cost>=0),
 price numeric(14,2) not null default 0 check(price>=0),
 stock integer not null default 0 check(stock>=0),
 min_stock integer not null default 2 check(min_stock>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sales (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id) on delete cascade,
 total numeric(14,2) not null default 0 check(total>=0),
 cost_total numeric(14,2) not null default 0 check(cost_total>=0),
 status text not null default 'completed' check(status in ('completed','cancelled')),
 created_at timestamptz not null default now(), cancelled_at timestamptz
);
create table if not exists public.sale_items (
 id uuid primary key default gen_random_uuid(),sale_id uuid not null references public.sales(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null,
 product_name text not null,quantity integer not null check(quantity>0),
 unit_price numeric(14,2) not null check(unit_price>=0),
 unit_cost numeric(14,2) not null check(unit_cost>=0),
 subtotal numeric(14,2) not null check(subtotal>=0)
);
create index if not exists idx_products_owner on public.products(owner_id);
create index if not exists idx_sales_owner_date on public.sales(owner_id,created_at desc);
create index if not exists idx_items_sale on public.sale_items(sale_id);
create index if not exists idx_items_owner on public.sale_items(owner_id);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Evitar edición de rol/estado y manipulación directa de ventas desde clientes.
create or replace function public.account_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
$$;
revoke all on function public.account_active() from public;
grant execute on function public.account_active() to authenticated;


drop policy if exists profile_select on public.profiles;
create policy profile_select on public.profiles for select to authenticated using(id=auth.uid());
drop policy if exists profile_update on public.profiles;
-- Solo puede cambiar el nombre comercial; mediante función restringida.

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated using(owner_id=auth.uid() and public.account_active());
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated with check(owner_id=auth.uid() and public.account_active());
drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated using(owner_id=auth.uid() and public.account_active()) with check(owner_id=auth.uid() and public.account_active());
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated using(owner_id=auth.uid() and public.account_active());
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales for select to authenticated using(owner_id=auth.uid() and public.account_active());
drop policy if exists items_select on public.sale_items;
create policy items_select on public.sale_items for select to authenticated using(owner_id=auth.uid() and public.account_active());

create or replace function public.update_my_business(p_name text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.account_active() then raise exception 'Cuenta deshabilitada';end if;
 if length(trim(p_name))<1 or length(p_name)>70 then raise exception 'Nombre inválido';end if;
 update public.profiles set business_name=trim(p_name) where id=auth.uid();
end$$;
revoke all on function public.update_my_business(text) from public;
grant execute on function public.update_my_business(text) to authenticated;

create or replace function public.complete_sale(p_lines jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_sale uuid;v_item jsonb;v_product public.products%rowtype;
 v_qty int;v_price numeric(14,2);v_total numeric(14,2):=0;v_cost numeric(14,2):=0;v_pid uuid;
begin
 if v_user is null or not public.account_active() then raise exception 'Cuenta no autorizada';end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<1 or jsonb_array_length(p_lines)>100 then raise exception 'Carrito inválido';end if;
 -- Prohibir duplicados para que cada línea sea un producto distinto.
 if (select count(*) from (select x->>'product_id' from jsonb_array_elements(p_lines) x group by x->>'product_id') q)<>jsonb_array_length(p_lines) then raise exception 'Hay productos duplicados';end if;
 insert into public.sales(owner_id) values(v_user) returning id into v_sale;
 for v_item in select value from jsonb_array_elements(p_lines) as t(value) order by value->>'product_id' loop
  v_pid:=(v_item->>'product_id')::uuid;v_qty:=(v_item->>'quantity')::int;v_price:=(v_item->>'unit_price')::numeric;
  if v_qty is null or v_qty<1 or v_qty>100000 or v_price is null or v_price<0 or v_price>999999999 then raise exception 'Cantidad o precio inválido';end if;
  select * into v_product from public.products where id=v_pid and owner_id=v_user for update;
  if not found then raise exception 'Producto no encontrado';end if;
  if v_product.stock<v_qty then raise exception 'Stock insuficiente para %',v_product.name;end if;
  update public.products set stock=stock-v_qty,updated_at=now() where id=v_pid;
  insert into public.sale_items(sale_id,owner_id,product_id,product_name,quantity,unit_price,unit_cost,subtotal)
  values(v_sale,v_user,v_pid,v_product.name,v_qty,v_price,v_product.cost,round(v_qty*v_price,2));
  v_total:=v_total+round(v_qty*v_price,2);v_cost:=v_cost+round(v_qty*v_product.cost,2);
 end loop;
 update public.sales set total=v_total,cost_total=v_cost where id=v_sale;
 return v_sale;
end$$;
revoke all on function public.complete_sale(jsonb) from public;
grant execute on function public.complete_sale(jsonb) to authenticated;

create or replace function public.cancel_sale(p_sale_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_sale public.sales%rowtype;v_item record;
begin
 if not public.account_active() then raise exception 'Cuenta deshabilitada';end if;
 select * into v_sale from public.sales where id=p_sale_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Venta no encontrada';end if;
 if v_sale.status='cancelled' then raise exception 'Venta ya anulada';end if;
 for v_item in select product_id,quantity from public.sale_items where sale_id=p_sale_id loop
  if v_item.product_id is not null then update public.products set stock=stock+v_item.quantity,updated_at=now() where id=v_item.product_id and owner_id=auth.uid();end if;
 end loop;
 update public.sales set status='cancelled',cancelled_at=now() where id=p_sale_id;
end$$;
revoke all on function public.cancel_sale(uuid) from public;
grant execute on function public.cancel_sale(uuid) to authenticated;

-- Restringir el cambio de stock vía clientes a operaciones de reposición: se gestiona en interfaz.
-- La lógica de venta siempre es transaccional mediante complete_sale().
