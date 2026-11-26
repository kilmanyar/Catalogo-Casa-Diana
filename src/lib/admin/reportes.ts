import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import catalog from "@/data/catalog.json";
import { requireAdminMiddleware } from "./require-admin";

const CAT = new Map<string, string>((catalog.products as { id: string; category: string }[]).map((p) => [p.id, p.category]));
const NOMBRE = new Map<string, string>((catalog.products as { id: string; name: string }[]).map((p) => [p.id, p.name]));

export type Reportes = {
  topProductos: { product_name: string; unidades: number; ventas: number }[];
  porCategoria: { categoria: string; unidades: number; ventas: number; costo: number; margen: number }[];
  clientesInactivos: { cliente: string; telefono: string; ultimo: string; dias: number; total: number }[];
  porLocal: { local: string; pedidos: number; ventas: number }[];
  reposicion: { product_id: string; nombre: string; qty: number; minimo: number; vendidos30: number; sugerido: number }[];
};

/** Reportes sobre pedidos entregados (los que realmente son venta). */
export const getReportes = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async (): Promise<Reportes> => {
    const sql = await getSql();

    const items = await sql<{ product_id: string; product_name: string; qty: number; subtotal: string; costo_unitario: string | null }>`
      select i.product_id, i.product_name, i.qty, i.subtotal, i.costo_unitario
      from pedido_items i join pedidos p on p.id = i.pedido_id where p.estado = 'entregado'
    `;
    const top = new Map<string, { product_name: string; unidades: number; ventas: number }>();
    const cat = new Map<string, { unidades: number; ventas: number; costo: number }>();
    for (const it of items) {
      const t = top.get(it.product_id) ?? { product_name: it.product_name, unidades: 0, ventas: 0 };
      t.unidades += it.qty;
      t.ventas += Number(it.subtotal);
      top.set(it.product_id, t);
      const c = cat.get(CAT.get(it.product_id) ?? "otros") ?? { unidades: 0, ventas: 0, costo: 0 };
      c.unidades += it.qty;
      c.ventas += Number(it.subtotal);
      c.costo += Number(it.costo_unitario ?? 0) * it.qty;
      cat.set(CAT.get(it.product_id) ?? "otros", c);
    }

    const ped = await sql<{ cliente_nombre: string | null; cliente_telefono: string | null; total: string; created_at: string }>`
      select cliente_nombre, cliente_telefono, total, created_at from pedidos where estado = 'entregado' order by created_at
    `;
    const clientes = new Map<string, { cliente: string; telefono: string; ultimo: string; total: number }>();
    for (const p of ped) {
      const key = (p.cliente_telefono || p.cliente_nombre || "").trim().toLowerCase();
      if (!key) continue;
      const c = clientes.get(key) ?? { cliente: p.cliente_nombre || "Sin nombre", telefono: p.cliente_telefono || "", ultimo: p.created_at, total: 0 };
      c.ultimo = p.created_at;
      c.total += Number(p.total);
      clientes.set(key, c);
    }
    const ahora = Date.now();
    const clientesInactivos = [...clientes.values()]
      .map((c) => ({ ...c, dias: Math.floor((ahora - new Date(c.ultimo).getTime()) / 86400000) }))
      .filter((c) => c.dias >= 60)
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);

    const vend30 = await sql<{ product_id: string; u: string }>`
      select i.product_id, sum(i.qty) as u from pedido_items i join pedidos p on p.id = i.pedido_id
      where p.estado = 'entregado' and p.created_at >= now() - interval '30 days' group by i.product_id
    `;
    const v30 = new Map(vend30.map((r) => [r.product_id, Number(r.u)]));
    const stock = await sql<{ product_id: string; qty: number; stock_minimo: number }>`
      select product_id, qty, stock_minimo from stock where stock_minimo > 0 and qty <= stock_minimo
    `;

    const loc = await sql<{ local: string; pedidos: string; ventas: string }>`
      select l.nombre as local, count(p.id) as pedidos, coalesce(sum(p.total), 0) as ventas
      from pedidos p join locales l on l.id = p.local_id where p.estado = 'entregado' group by l.nombre order by ventas desc
    `;

    return {
      porLocal: loc.map((r) => ({ local: r.local, pedidos: Number(r.pedidos), ventas: Number(r.ventas) })),
      topProductos: [...top.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 15),
      porCategoria: [...cat.entries()]
        .map(([categoria, v]) => ({ categoria, ...v, margen: v.ventas - v.costo }))
        .sort((a, b) => b.ventas - a.ventas),
      clientesInactivos,
      reposicion: stock
        .map((s) => {
          const vendidos30 = v30.get(s.product_id) ?? 0;
          return {
            product_id: s.product_id,
            nombre: NOMBRE.get(s.product_id) ?? s.product_id,
            qty: s.qty,
            minimo: s.stock_minimo,
            vendidos30,
            sugerido: Math.max(s.stock_minimo * 2 - s.qty, vendidos30 - s.qty, 1),
          };
        })
        .sort((a, b) => a.qty - b.qty),
    };
  });
