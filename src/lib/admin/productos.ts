import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type ProductoPanel = {
  id: string;
  esNuevo: boolean;
  oculto: boolean;
  nombre: string | null;
  categoria: string | null;
  marca: string | null;
  presentacion: string | null;
  precio: number | null;
  precioEfectivo: number | null;
  stock: number | null;
  notas: string | null;
  genero: string | null;
  imagen: string | null;
};

type Row = {
  id: string; es_nuevo: boolean; oculto: boolean; nombre: string | null; categoria: string | null; marca: string | null;
  presentacion: string | null; precio: string | null; precio_efectivo: string | null; stock: number | null;
  notas: string | null; genero: string | null; image_v: string | null;
};

const num = (v: string | null) => (v === null ? null : Number(v));

async function leer(): Promise<ProductoPanel[]> {
  const sql = await getSql();
  const rows = await sql<Row>`select id, es_nuevo, oculto, nombre, categoria, marca, presentacion, precio, precio_efectivo, stock, notas, genero, image_v from productos`;
  return rows.map((r) => ({
    id: r.id,
    esNuevo: r.es_nuevo,
    oculto: r.oculto,
    nombre: r.nombre,
    categoria: r.categoria,
    marca: r.marca,
    presentacion: r.presentacion,
    precio: num(r.precio),
    precioEfectivo: num(r.precio_efectivo),
    stock: r.stock,
    notas: r.notas,
    genero: r.genero,
    imagen: r.image_v ? `/api/img/${encodeURIComponent(r.id)}?v=${r.image_v}` : null,
  }));
}

/** Público: cambios hechos desde el panel (precios, productos nuevos, ocultos, fotos). */
export const listProductosPanel = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await leer();
  } catch {
    return [] as ProductoPanel[];
  }
});

const productoInput = z.object({
  id: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_-]+$/),
  esNuevo: z.boolean(),
  oculto: z.boolean(),
  nombre: z.string().trim().max(200).nullable(),
  categoria: z.string().trim().max(60).nullable(),
  marca: z.string().trim().max(100).nullable(),
  presentacion: z.string().trim().max(100).nullable(),
  precio: z.number().nonnegative().nullable(),
  precioEfectivo: z.number().nonnegative().nullable(),
  stock: z.number().int().nonnegative().nullable(),
  notas: z.string().trim().max(1000).nullable(),
  genero: z.string().trim().max(30).nullable(),
});

export const guardarProducto = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => productoInput.parse(input))
  .handler(async ({ data }) => {
    if (data.esNuevo && (!data.nombre || !data.categoria || !data.precio)) throw new Error("Un producto nuevo necesita nombre, categoría y precio.");
    const sql = await getSql();
    await sql`
      insert into productos (id, es_nuevo, oculto, nombre, categoria, marca, presentacion, precio, precio_efectivo, stock, notas, genero, updated_at)
      values (${data.id}, ${data.esNuevo}, ${data.oculto}, ${data.nombre || null}, ${data.categoria || null}, ${data.marca || null}, ${data.presentacion || null},
              ${data.precio}, ${data.precioEfectivo}, ${data.stock}, ${data.notas || null}, ${data.genero || null}, now())
      on conflict (id) do update set oculto = excluded.oculto, nombre = excluded.nombre, categoria = excluded.categoria,
        marca = excluded.marca, presentacion = excluded.presentacion, precio = excluded.precio, precio_efectivo = excluded.precio_efectivo,
        stock = excluded.stock, notas = excluded.notas, genero = excluded.genero, updated_at = now()
    `;
    return { ok: true };
  });

export const subirImagenProducto = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.string().trim().min(1).max(60).regex(/^[A-Za-z0-9_-]+$/), dataUrl: z.string().max(900_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const m = data.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error("Imagen no válida.");
    const sql = await getSql();
    await sql`insert into productos (id) values (${data.id}) on conflict (id) do nothing`;
    await sql`
      insert into producto_imagenes (product_id, mime, data_b64) values (${data.id}, ${m[1]}, ${m[2]})
      on conflict (product_id) do update set mime = excluded.mime, data_b64 = excluded.data_b64
    `;
    await sql`update productos set image_v = ${Date.now()}, updated_at = now() where id = ${data.id}`;
    return { ok: true };
  });

/** Quita los cambios del panel: el producto del catálogo vuelve a como estaba, o el producto nuevo se elimina. */
export const restaurarProducto = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from producto_imagenes where product_id = ${data.id}`;
    await sql`delete from productos where id = ${data.id}`;
    return { ok: true };
  });

export const listProductosAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => leer());
