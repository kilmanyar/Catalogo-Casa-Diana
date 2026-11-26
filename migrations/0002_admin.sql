-- Casa Diana — back office: stock, compras (purchases), pedidos (orders) y
-- gastos (expenses). Single-tenant admin data (not per visiting customer), so
-- rows are not scoped by user_id; access is gated at the application layer by
-- an email allowlist (src/lib/admin/config.ts) checked in
-- src/lib/admin/require-admin.server.ts on every admin server function.
-- created_by records which admin did it, for an audit trail only.

create table if not exists stock (
  product_id text primary key,
  qty integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists compras (
  id serial primary key,
  product_id text not null,
  product_name text not null,
  qty integer not null check (qty > 0),
  costo_unitario numeric(12,2) not null check (costo_unitario >= 0),
  costo_total numeric(12,2) not null,
  proveedor text,
  nota text,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists compras_product_id_idx on compras (product_id);
create index if not exists compras_created_at_idx on compras (created_at);

create table if not exists pedidos (
  id serial primary key,
  origen text not null default 'manual', -- 'whatsapp' (auto, desde el carrito) | 'manual' (cargado por el admin)
  cliente_nombre text,
  cliente_telefono text,
  estado text not null default 'pendiente', -- pendiente | confirmado | entregado | cancelado
  metodo_pago text, -- tarjeta | efectivo | transferencia
  total numeric(12,2) not null default 0,
  nota text,
  stock_descontado boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pedidos_estado_idx on pedidos (estado);
create index if not exists pedidos_created_at_idx on pedidos (created_at);

create table if not exists pedido_items (
  id serial primary key,
  pedido_id integer not null references pedidos(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  qty integer not null check (qty > 0),
  precio_unitario numeric(12,2) not null,
  costo_unitario numeric(12,2),
  subtotal numeric(12,2) not null
);
create index if not exists pedido_items_pedido_id_idx on pedido_items (pedido_id);
create index if not exists pedido_items_product_id_idx on pedido_items (product_id);

create table if not exists gastos (
  id serial primary key,
  categoria text not null,
  descripcion text,
  monto numeric(12,2) not null check (monto >= 0),
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists gastos_created_at_idx on gastos (created_at);
