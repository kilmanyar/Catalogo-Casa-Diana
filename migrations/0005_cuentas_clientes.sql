alter table pedidos add column if not exists user_id text;
create index if not exists pedidos_user_idx on pedidos (user_id);
