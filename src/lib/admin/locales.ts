import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";
import { ensureStockRow } from "./require-admin";

export type LocalRow = { id: number; nombre: string; direccion: string | null; activo: boolean };

export const listLocales = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<LocalRow>`select id, nombre, direccion, activo from locales order by id`;
  });

export const guardarLocal = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.number().int().nullable(), nombre: z.string().trim().min(2).max(60), direccion: z.string().trim().max(200).nullable(), activo: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    if (data.id === null) {
      await sql`insert into locales (nombre, direccion, activo) values (${data.nombre}, ${data.direccion}, ${data.activo})`;
    } else {
      if (data.id === 1 && !data.activo) throw new Error("El local principal no se puede desactivar.");
      await sql`update locales set nombre = ${data.nombre}, direccion = ${data.direccion}, activo = ${data.activo} where id = ${data.id}`;
    }
    return { ok: true };
  });

export type StockLocalRow = { product_id: string; total: number; por_local: Record<string, number> };

/** Stock por local de los productos con stock cargado. El principal = total − suma de los otros locales. */
export const stockPorLocal = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async (): Promise<StockLocalRow[]> => {
    const sql = await getSql();
    const stock = await sql<{ product_id: string; qty: number }>`select product_id, qty from stock where qty <> 0 or controlar = true order by product_id`;
    const otros = await sql<{ product_id: string; local_id: number; qty: number }>`select product_id, local_id, qty from stock_locales where qty > 0`;
    return stock.map((s) => {
      const por_local: Record<string, number> = {};
      let suma = 0;
      for (const o of otros.filter((x) => x.product_id === s.product_id)) {
        por_local[String(o.local_id)] = o.qty;
        suma += o.qty;
      }
      por_local["1"] = s.qty - suma;
      return { product_id: s.product_id, total: s.qty, por_local };
    });
  });

export const transferirStock = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ productId: z.string().min(1), desde: z.number().int(), hasta: z.number().int(), qty: z.number().int().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.desde === data.hasta) throw new Error("Elegí locales distintos.");
    await ensureStockRow(data.productId);
    const sql = await getSql();
    const total = (await sql<{ qty: number }>`select qty from stock where product_id = ${data.productId}`)[0]?.qty ?? 0;
    const otros = await sql<{ local_id: number; qty: number }>`select local_id, qty from stock_locales where product_id = ${data.productId}`;
    const suma = otros.reduce((a, o) => a + o.qty, 0);
    const disponible = data.desde === 1 ? total - suma : otros.find((o) => o.local_id === data.desde)?.qty ?? 0;
    if (data.qty > disponible) throw new Error(`En ese local solo hay ${Math.max(0, disponible)} unidades.`);
    if (data.desde !== 1) {
      await sql`update stock_locales set qty = qty - ${data.qty} where product_id = ${data.productId} and local_id = ${data.desde}`;
    }
    if (data.hasta !== 1) {
      await sql`
        insert into stock_locales (product_id, local_id, qty) values (${data.productId}, ${data.hasta}, ${data.qty})
        on conflict (product_id, local_id) do update set qty = stock_locales.qty + excluded.qty
      `;
    }
    return { ok: true };
  });
