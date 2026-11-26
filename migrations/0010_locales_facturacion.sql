create table if not exists locales (
  id serial primary key,
  nombre text not null unique,
  direccion text,
  activo boolean not null default true
);
insert into locales (id, nombre) values (1, 'Principal') on conflict (id) do nothing;
select setval(pg_get_serial_sequence('locales', 'id'), greatest((select max(id) from locales), 1));

-- Stock de locales distintos del principal. El principal es: stock total − suma de los demás.
create table if not exists stock_locales (
  product_id text not null,
  local_id integer not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (product_id, local_id)
);
alter table pedidos add column if not exists local_id integer not null default 1;

create table if not exists facturacion_config (
  id integer primary key default 1 check (id = 1),
  razon_social text not null default '',
  ruc text not null default '',
  direccion text not null default '',
  telefono text not null default '',
  timbrado text not null default '',
  vigencia_desde date,
  vigencia_hasta date,
  establecimiento text not null default '001',
  punto text not null default '001',
  siguiente_numero integer not null default 1
);
insert into facturacion_config (id) values (1) on conflict (id) do nothing;

create table if not exists facturas (
  id serial primary key,
  pedido_id integer not null unique,
  numero text not null unique,
  fecha timestamptz not null default now(),
  cliente_nombre text not null,
  ruc_ci text not null,
  total numeric(14,2) not null,
  iva10 numeric(14,2) not null,
  detalle jsonb not null,
  estado text not null default 'emitida'
);
