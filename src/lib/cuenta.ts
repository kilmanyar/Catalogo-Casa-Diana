import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { clienteMiddleware } from "./cuenta-middleware";

export type MiPedido = {
  id: number;
  estado: string;
  total: number;
  descuento: number;
  fecha: string;
  items: { productId: string; nombre: string; qty: number; precio: number }[];
};

/** Pedidos del cliente que inició sesión (solo los suyos, por user_id verificado en el servidor). */
export const misPedidos = createServerFn({ method: "GET" })
  .middleware([clienteMiddleware])
  .handler(async ({ context }): Promise<MiPedido[]> => {
    const sql = await getSql();
    const pedidos = await sql<{ id: number; estado: string; total: string; descuento: string; created_at: string }>`
      select id, estado, total, descuento, created_at from pedidos
      where user_id = ${context.userId} order by created_at desc limit 50
    `;
    if (pedidos.length === 0) return [];
    const ids = pedidos.map((p) => p.id);
    const items = await sql<{ pedido_id: number; product_id: string; product_name: string; qty: number; precio_unitario: string }>`
      select pedido_id, product_id, product_name, qty, precio_unitario from pedido_items
      where pedido_id = any(${ids}) order by id
    `;
    return pedidos.map((p) => ({
      id: p.id,
      estado: p.estado,
      total: Number(p.total),
      descuento: Number(p.descuento),
      fecha: p.created_at,
      items: items
        .filter((i) => i.pedido_id === p.id)
        .map((i) => ({ productId: i.product_id, nombre: i.product_name, qty: i.qty, precio: Number(i.precio_unitario) })),
    }));
  });
