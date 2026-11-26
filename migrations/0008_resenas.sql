create table if not exists resenas (
  id serial primary key,
  product_id text not null,
  user_id text not null,
  nombre text not null,
  estrellas integer not null check (estrellas between 1 and 5),
  comentario text not null default '',
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists resenas_producto_idx on resenas (product_id, estado);
