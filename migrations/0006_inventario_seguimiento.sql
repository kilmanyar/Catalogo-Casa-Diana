alter table stock add column if not exists controlar boolean not null default false;
alter table stock add column if not exists codigo_barras text;
update stock set controlar = true where qty <> 0 or stock_minimo > 0;
create index if not exists stock_barras_idx on stock (codigo_barras);

create table if not exists mermas (
  id serial primary key,
  product_id text not null,
  qty integer not null check (qty > 0),
  motivo text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table pedidos add column if not exists etapa text not null default 'recibido';
