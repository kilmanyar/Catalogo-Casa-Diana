import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

export type Seguimiento = {
  id: number;
  estado: string;
  etapa: string;
  fecha: string;
  entregaTipo: string;
  fechaEntrega: string | null;
  items: { nombre: string; qty: number }[];
};

const digits = (s: string) => s.replace(/\D/g, "");
/** Normaliza teléfonos de Paraguay: 0981…, 595981… y +595 981… quedan iguales. */
const norm = (s: string) => {
  const d = digits(s);
  return d.startsWith("595") ? d.slice(3) : d.replace(/^0+/, "");
};

/** Público: el cliente consulta su pedido con el n.º y el teléfono con el que pidió. */
export const consultarPedido = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.number().int().positive(), telefono: z.string().trim().min(6).max(30) }).parse(input),
  )
  .handler(async ({ data }): Promise<Seguimiento | null> => {
    const sql = await getSql();
    const rows = await sql<{
      id: number; estado: string; etapa: string; created_at: string; cliente_telefono: string | null;
      entrega_tipo: string; fecha_entrega: string | null;
    }>`select id, estado, etapa, created_at, cliente_telefono, entrega_tipo, fecha_entrega from pedidos where id = ${data.id}`;
    const p = rows[0];
    if (!p || !p.cliente_telefono || norm(p.cliente_telefono) !== norm(data.telefono) || norm(data.telefono).length < 6) return null;
    const items = await sql<{ product_name: string; qty: number }>`select product_name, qty from pedido_items where pedido_id = ${p.id} order by id`;
    return {
      id: p.id,
      estado: p.estado,
      etapa: p.etapa,
      fecha: p.created_at,
      entregaTipo: p.entrega_tipo,
      fechaEntrega: p.fecha_entrega ? String(p.fecha_entrega).slice(0, 10) : null,
      items: items.map((i) => ({ nombre: i.product_name, qty: i.qty })),
    };
  });
