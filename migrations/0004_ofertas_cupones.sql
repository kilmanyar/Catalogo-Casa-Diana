create table if not exists ofertas (
  product_id text primary key,
  etiqueta text not null default 'oferta',
  precio_oferta numeric(12,2),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists cupones (
  codigo text primary key,
  tipo text not null default 'porcentaje',
  valor numeric(12,2) not null,
  activo boolean not null default true,
  max_usos integer,
  usos integer not null default 0,
  vence date,
  created_at timestamptz not null default now()
);
alter table pedidos add column if not exists cupon text;
alter table pedidos add column if not exists descuento numeric(12,2) not null default 0;
