-- Casa Diana — logística de entregas, facturación básica, stock mínimo y
-- usuarios del panel (staff) administrables desde /admin/usuarios.

alter table stock add column if not exists stock_minimo integer not null default 0;

alter table pedidos add column if not exists entrega_tipo text not null default 'retiro'; -- retiro | delivery
alter table pedidos add column if not exists direccion text;
alter table pedidos add column if not exists costo_envio numeric(12,2) not null default 0;
alter table pedidos add column if not exists fecha_entrega date;
alter table pedidos add column if not exists pagado boolean not null default false;
alter table pedidos add column if not exists ruc_ci text;
alter table pedidos add column if not exists factura_nro text;
create index if not exists pedidos_fecha_entrega_idx on pedidos (fecha_entrega);

-- Staff con acceso al panel además de los emails fijos de src/lib/admin/config.ts
-- (esos son "dueños" y son los únicos que pueden agregar/quitar staff).
create table if not exists admin_users (
  email text primary key,
  created_by text not null,
  created_at timestamptz not null default now()
);
