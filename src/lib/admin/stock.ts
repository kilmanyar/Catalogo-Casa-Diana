import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ensureStockRow } from "./require-admin";

export type StockRow = {
  product_id: string;
  qty: number;
  stock_minimo: number;
  controlar: boolean;
  codigo_barras: string | null;
  updated_at: string;
};

/** Current stock for every product that has a row (0 by default = not yet tracked). */
export const listStock = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<StockRow>`select * from stock order by updated_at desc`;
  });

export const ajustarStock = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z
      .object({ productId: z.string().min(1), qty: z.number().int() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await ensureStockRow(data.productId);
    const sql = await getSql();
    await sql`update stock set qty = ${data.qty}, controlar = true, updated_at = now() where product_id = ${data.productId}`;
    return { ok: true };
  });

/** Umbral de alerta: cuando qty <= stock_minimo (y el mínimo es > 0) aparece en el resumen. */
export const setStockMinimo = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z
      .object({ productId: z.string().min(1), minimo: z.number().int().min(0) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await ensureStockRow(data.productId);
    const sql = await getSql();
    await sql`update stock set stock_minimo = ${data.minimo}, updated_at = now() where product_id = ${data.productId}`;
    return { ok: true };
  });

export const setCodigoBarras = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ productId: z.string().min(1), codigo: z.string().trim().max(60) }).parse(input),
  )
  .handler(async ({ data }) => {
    await ensureStockRow(data.productId);
    const sql = await getSql();
    await sql`update stock set codigo_barras = ${data.codigo || null}, updated_at = now() where product_id = ${data.productId}`;
    return { ok: true };
  });

export type MermaRow = { id: number; product_id: string; qty: number; motivo: string; created_by: string; created_at: string };

/** Merma (rotura, vencimiento, pérdida, muestra): descuenta stock y queda registrada. */
export const registrarMerma = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z
      .object({ productId: z.string().min(1), qty: z.number().int().positive(), motivo: z.string().trim().min(2).max(200) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureStockRow(data.productId);
    const sql = await getSql();
    await sql`update stock set qty = qty - ${data.qty}, controlar = true, updated_at = now() where product_id = ${data.productId}`;
    await sql`insert into mermas (product_id, qty, motivo, created_by) values (${data.productId}, ${data.qty}, ${data.motivo}, ${context.adminEmail})`;
    return { ok: true };
  });

export const listMermas = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<MermaRow>`select * from mermas order by created_at desc limit 100`;
  });

/**
 * Público: disponibilidad real de los productos con stock controlado.
 * disponible = stock − unidades reservadas por pedidos pendientes/confirmados
 * que todavía no descontaron stock (la reserva se libera al entregar o cancelar).
 */
export const listDisponibilidad = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<{ product_id: string; disponible: string }>`
      select s.product_id,
             s.qty - coalesce((
               select sum(i.qty) from pedido_items i join pedidos p on p.id = i.pedido_id
               where i.product_id = s.product_id and p.estado in ('pendiente','confirmado') and p.stock_descontado = false
             ), 0) as disponible
      from stock s where s.controlar = true
    `;
    return rows.map((r) => ({ productId: r.product_id, disponible: Math.max(0, Number(r.disponible)) }));
  } catch {
    return [];
  }
});
