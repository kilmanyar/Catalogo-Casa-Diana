import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type OfertaRow = { product_id: string; etiqueta: string; precio_oferta: string | null; activo: boolean };

/** Público: etiquetas y ofertas activas que se muestran en la tienda. */
export const listOfertasPublicas = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    const rows = await sql<OfertaRow>`select product_id, etiqueta, precio_oferta, activo from ofertas where activo = true`;
    return rows.map((r) => ({
      productId: r.product_id,
      etiqueta: r.etiqueta,
      precioOferta: r.precio_oferta ? Number(r.precio_oferta) : null,
    }));
  } catch {
    return [];
  }
});

export const listOfertasAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<OfertaRow>`select product_id, etiqueta, precio_oferta, activo from ofertas order by created_at desc`;
  });

const ofertaInput = z.object({
  productId: z.string().trim().min(1).max(100),
  etiqueta: z.enum(["oferta", "nuevo", "mas_vendido"]),
  precioOferta: z.number().positive().nullable(),
  activo: z.boolean(),
});

export const guardarOferta = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => ofertaInput.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`
      insert into ofertas (product_id, etiqueta, precio_oferta, activo)
      values (${data.productId}, ${data.etiqueta}, ${data.precioOferta}, ${data.activo})
      on conflict (product_id) do update set etiqueta = excluded.etiqueta,
        precio_oferta = excluded.precio_oferta, activo = excluded.activo
    `;
    return { ok: true };
  });

export const borrarOferta = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ productId: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from ofertas where product_id = ${data.productId}`;
    return { ok: true };
  });
