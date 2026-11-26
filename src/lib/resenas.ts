import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { optionalUserMiddleware, clienteMiddleware } from "./cuenta-middleware";
import { requireAdminMiddleware } from "./admin/require-admin";

export type ResenaPublica = { id: number; nombre: string; estrellas: number; comentario: string; fecha: string };

/** Público: reseñas aprobadas de un producto y su promedio. */
export const listResenas = createServerFn({ method: "GET" })
  .validator((input: unknown) => z.object({ productId: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      const rows = await sql<{ id: number; nombre: string; estrellas: number; comentario: string; created_at: string }>`
        select id, nombre, estrellas, comentario, created_at from resenas
        where product_id = ${data.productId} and estado = 'aprobada' order by created_at desc limit 50
      `;
      const lista: ResenaPublica[] = rows.map((r) => ({ id: r.id, nombre: r.nombre, estrellas: r.estrellas, comentario: r.comentario, fecha: r.created_at }));
      const promedio = lista.length ? lista.reduce((a, r) => a + r.estrellas, 0) / lista.length : 0;
      return { lista, promedio, total: lista.length };
    } catch {
      return { lista: [] as ResenaPublica[], promedio: 0, total: 0 };
    }
  });

/** Si el cliente con sesión puede opinar (compró y recibió el producto) y qué opinó antes. */
export const miEstadoResena = createServerFn({ method: "GET" })
  .middleware([optionalUserMiddleware])
  .validator((input: unknown) => z.object({ productId: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!context.clienteId) return { sesion: false, puede: false, previa: null as null | { estrellas: number; comentario: string; estado: string } };
    const sql = await getSql();
    const compro = await sql<{ n: string }>`
      select count(*) as n from pedido_items i join pedidos p on p.id = i.pedido_id
      where p.user_id = ${context.clienteId} and p.estado = 'entregado' and i.product_id = ${data.productId}
    `;
    const previa = await sql<{ estrellas: number; comentario: string; estado: string }>`
      select estrellas, comentario, estado from resenas where product_id = ${data.productId} and user_id = ${context.clienteId}
    `;
    return { sesion: true, puede: Number(compro[0]?.n ?? 0) > 0, previa: previa[0] ?? null };
  });

export const enviarResena = createServerFn({ method: "POST" })
  .middleware([clienteMiddleware])
  .validator((input: unknown) =>
    z.object({ productId: z.string().min(1).max(100), estrellas: z.number().int().min(1).max(5), comentario: z.string().trim().max(600) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const compro = await sql<{ n: string }>`
      select count(*) as n from pedido_items i join pedidos p on p.id = i.pedido_id
      where p.user_id = ${context.userId} and p.estado = 'entregado' and i.product_id = ${data.productId}
    `;
    if (Number(compro[0]?.n ?? 0) === 0) throw new Error("Solo podés opinar sobre productos que compraste y recibiste.");
    const u = await sql<{ name: string }>`select name from "user" where id = ${context.userId}`;
    const nombre = (u[0]?.name || "Cliente").split(" ")[0];
    await sql`
      insert into resenas (product_id, user_id, nombre, estrellas, comentario, estado)
      values (${data.productId}, ${context.userId}, ${nombre}, ${data.estrellas}, ${data.comentario}, 'pendiente')
      on conflict (product_id, user_id) do update set estrellas = excluded.estrellas,
        comentario = excluded.comentario, estado = 'pendiente', created_at = now()
    `;
    return { ok: true };
  });

export type ResenaAdmin = { id: number; product_id: string; nombre: string; estrellas: number; comentario: string; estado: string; created_at: string };

export const listResenasAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<ResenaAdmin>`select id, product_id, nombre, estrellas, comentario, estado, created_at from resenas order by (estado = 'pendiente') desc, created_at desc limit 200`;
  });

export const moderarResena = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int(), estado: z.enum(["aprobada", "rechazada", "pendiente"]) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`update resenas set estado = ${data.estado} where id = ${data.id}`;
    return { ok: true };
  });

export const borrarResena = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from resenas where id = ${data.id}`;
    return { ok: true };
  });
