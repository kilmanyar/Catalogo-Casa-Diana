import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type ClienteRow = {
  cliente: string;
  telefono: string | null;
  pedidos: number;
  entregados: number;
  total_comprado: number;
  ultimo_pedido: string;
};

/** Clientes derivados de los pedidos (agrupados por teléfono, o por nombre si no hay teléfono). */
export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async (): Promise<ClienteRow[]> => {
    const sql = await getSql();
    const rows = await sql<{
      cliente: string | null;
      telefono: string | null;
      pedidos: number;
      entregados: number;
      total_comprado: string | null;
      ultimo_pedido: string;
    }>`
      select
        max(nullif(trim(cliente_nombre), '')) as cliente,
        max(nullif(trim(cliente_telefono), '')) as telefono,
        count(*)::int as pedidos,
        count(*) filter (where estado = 'entregado')::int as entregados,
        coalesce(sum(total) filter (where estado = 'entregado'), 0) as total_comprado,
        max(created_at) as ultimo_pedido
      from pedidos
      where coalesce(nullif(trim(cliente_telefono), ''), nullif(trim(cliente_nombre), '')) is not null
      group by coalesce(nullif(trim(cliente_telefono), ''), lower(nullif(trim(cliente_nombre), '')))
      order by max(created_at) desc
      limit 1000
    `;
    return rows.map((r) => ({
      cliente: r.cliente ?? "(sin nombre)",
      telefono: r.telefono,
      pedidos: r.pedidos,
      entregados: r.entregados,
      total_comprado: Number(r.total_comprado ?? 0),
      ultimo_pedido: r.ultimo_pedido,
    }));
  });
