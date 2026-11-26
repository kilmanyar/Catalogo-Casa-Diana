import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ensureStockRow } from "./require-admin";

export type StockRow = { product_id: string; qty: number; stock_minimo: number; updated_at: string };

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
    await sql`update stock set qty = ${data.qty}, updated_at = now() where product_id = ${data.productId}`;
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
