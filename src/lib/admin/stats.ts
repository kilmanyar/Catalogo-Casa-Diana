import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type DashboardStats = {
  ventasHoy: number;
  ventasMes: number;
  pedidosPendientes: number;
  gastosMes: number;
  comprasMes: number;
  margenMes: number;
  entregasPendientes: number;
  stockBajo: { product_id: string; qty: number; stock_minimo: number }[];
  ventasPorDia: { dia: string; ventas: number; costo: number }[];
  topProductos: { product_name: string; unidades: number; ventas: number }[];
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async (): Promise<DashboardStats> => {
    const sql = await getSql();

    const [ventasHoyRow] = await sql<{ total: string | null }>`
      select coalesce(sum(total), 0) as total from pedidos
      where estado = 'entregado' and created_at >= date_trunc('day', now())
    `;
    const [ventasMesRow] = await sql<{ total: string | null }>`
      select coalesce(sum(total), 0) as total from pedidos
      where estado = 'entregado' and created_at >= date_trunc('month', now())
    `;
    const [pendientesRow] = await sql<{ n: number }>`
      select count(*)::int as n from pedidos where estado = 'pendiente'
    `;
    const [gastosMesRow] = await sql<{ total: string | null }>`
      select coalesce(sum(monto), 0) as total from gastos
      where created_at >= date_trunc('month', now())
    `;
    const [comprasMesRow] = await sql<{ total: string | null }>`
      select coalesce(sum(costo_total), 0) as total from compras
      where created_at >= date_trunc('month', now())
    `;
    const [costoVentasMesRow] = await sql<{ total: string | null }>`
      select coalesce(sum(pi.costo_unitario * pi.qty), 0) as total
      from pedido_items pi
      join pedidos p on p.id = pi.pedido_id
      where p.estado = 'entregado' and p.created_at >= date_trunc('month', now())
    `;

    const ventasPorDia = await sql<{ dia: string; ventas: string | null; costo: string | null }>`
      select
        to_char(p.created_at, 'YYYY-MM-DD') as dia,
        coalesce(sum(p.total), 0) as ventas,
        coalesce(sum(pi.costo), 0) as costo
      from pedidos p
      left join (
        select pedido_id, sum(costo_unitario * qty) as costo
        from pedido_items group by pedido_id
      ) pi on pi.pedido_id = p.id
      where p.estado = 'entregado' and p.created_at >= now() - interval '30 days'
      group by 1
      order by 1
    `;

    const topProductos = await sql<{ product_name: string; unidades: string; ventas: string }>`
      select pi.product_name, sum(pi.qty) as unidades, sum(pi.subtotal) as ventas
      from pedido_items pi
      join pedidos p on p.id = pi.pedido_id
      where p.estado = 'entregado' and p.created_at >= now() - interval '30 days'
      group by pi.product_name
      order by sum(pi.subtotal) desc
      limit 10
    `;

    const [entregasRow] = await sql<{ n: number }>`
      select count(*)::int as n from pedidos where estado in ('pendiente', 'confirmado')
    `;
    const stockBajo = await sql<{ product_id: string; qty: number; stock_minimo: number }>`
      select product_id, qty, stock_minimo from stock
      where stock_minimo > 0 and qty <= stock_minimo
      order by qty asc limit 50
    `;

    const ventasMes = Number(ventasMesRow.total ?? 0);
    const gastosMes = Number(gastosMesRow.total ?? 0);
    const costoVentasMes = Number(costoVentasMesRow.total ?? 0);

    return {
      ventasHoy: Number(ventasHoyRow.total ?? 0),
      ventasMes,
      pedidosPendientes: pendientesRow.n,
      gastosMes,
      comprasMes: Number(comprasMesRow.total ?? 0),
      margenMes: ventasMes - costoVentasMes - gastosMes,
      entregasPendientes: entregasRow.n,
      stockBajo,
      ventasPorDia: ventasPorDia.map((r) => ({
        dia: r.dia,
        ventas: Number(r.ventas ?? 0),
        costo: Number(r.costo ?? 0),
      })),
      topProductos: topProductos.map((r) => ({
        product_name: r.product_name,
        unidades: Number(r.unidades),
        ventas: Number(r.ventas),
      })),
    };
  });
