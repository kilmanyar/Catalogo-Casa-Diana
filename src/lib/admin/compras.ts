import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ensureStockRow } from "./require-admin";

export type CompraRow = {
  id: number;
  product_id: string;
  product_name: string;
  qty: number;
  costo_unitario: string;
  costo_total: string;
  proveedor: string | null;
  nota: string | null;
  created_by: string;
  created_at: string;
};

export const listCompras = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<CompraRow>`select * from compras order by created_at desc limit 1000`;
  });

/** Costo unitario de la última compra registrada para un producto (null si nunca se compró). */
export const ultimoCostoProducto = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ productId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ costo_unitario: string }>`
      select costo_unitario from compras where product_id = ${data.productId}
      order by created_at desc limit 1
    `;
    return rows[0] ? Number(rows[0].costo_unitario) : null;
  });

const registrarCompraInput = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().int().positive(),
  costoUnitario: z.number().nonnegative(),
  proveedor: z.string().trim().max(200).optional(),
  nota: z.string().trim().max(2000).optional(),
});

/** Registra una compra de mercadería: suma al costo histórico Y aumenta el stock. */
export const registrarCompra = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => registrarCompraInput.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const costoTotal = data.qty * data.costoUnitario;
    await sql`
      insert into compras (product_id, product_name, qty, costo_unitario, costo_total, proveedor, nota, created_by)
      values (${data.productId}, ${data.productName}, ${data.qty}, ${data.costoUnitario}, ${costoTotal}, ${data.proveedor ?? null}, ${data.nota ?? null}, ${context.adminEmail})
    `;
    await ensureStockRow(data.productId);
    await sql`update stock set qty = qty + ${data.qty}, controlar = true, updated_at = now() where product_id = ${data.productId}`;
    return { ok: true };
  });
