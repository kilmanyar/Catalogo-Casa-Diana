create table if not exists productos (
  id text primary key,
  es_nuevo boolean not null default false,
  oculto boolean not null default false,
  nombre text,
  categoria text,
  marca text,
  presentacion text,
  precio numeric(12,2),
  precio_efectivo numeric(12,2),
  stock integer,
  notas text,
  genero text,
  image_v bigint,
  updated_at timestamptz not null default now()
);
create table if not exists producto_imagenes (
  product_id text primary key,
  mime text not null default 'image/jpeg',
  data_b64 text not null
);
