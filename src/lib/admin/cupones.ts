import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type CuponRow = {
  codigo: string;
  tipo: string;
  valor: string;
  activo: boolean;
  max_usos: number | null;
  usos: number;
  vence: string | null;
};

/** Calcula el descuento de un cupón (compartido por la validación pública y el registro del pedido). */
export async function calcularCupon(codigo: string, subtotal: number) {
  const sql = await getSql();
  const code = codigo.trim().toUpperCase();
  const rows = await sql<CuponRow>`select * from cupones where codigo = ${code}`;
  const c = rows[0];
  if (!c || !c.activo) return { ok: false as const, mensaje: "Cupón no válido." };
  if (c.vence && c.vence.slice(0, 10) < new Date().toISOString().slice(0, 10)) return { ok: false as const, mensaje: "El cupón venció." };
  if (c.max_usos !== null && c.usos >= c.max_usos) return { ok: false as const, mensaje: "El cupón ya no tiene usos disponibles." };
  const valor = Number(c.valor);
  const bruto = c.tipo === "porcentaje" ? (subtotal * valor) / 100 : valor;
  const descuento = Math.max(0, Math.min(Math.round(bruto), subtotal));
  return { ok: true as const, codigo: c.codigo, descuento, mensaje: "Cupón aplicado." };
}

export const validarCupon = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ codigo: z.string().trim().min(1).max(40), subtotal: z.number().nonnegative() }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      return await calcularCupon(data.codigo, data.subtotal);
    } catch {
      return { ok: false as const, mensaje: "No se pudo validar el cupón." };
    }
  });

export const listCupones = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<CuponRow>`select * from cupones order by created_at desc`;
  });

const cuponInput = z.object({
  codigo: z.string().trim().min(2).max(40).transform((s) => s.toUpperCase()),
  tipo: z.enum(["porcentaje", "monto"]),
  valor: z.number().positive(),
  activo: z.boolean(),
  maxUsos: z.number().int().positive().nullable(),
  vence: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export const guardarCupon = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => cuponInput.parse(input))
  .handler(async ({ data }) => {
    if (data.tipo === "porcentaje" && data.valor > 100) throw new Error("El porcentaje no puede superar 100.");
    const sql = await getSql();
    await sql`
      insert into cupones (codigo, tipo, valor, activo, max_usos, vence)
      values (${data.codigo}, ${data.tipo}, ${data.valor}, ${data.activo}, ${data.maxUsos}, ${data.vence})
      on conflict (codigo) do update set tipo = excluded.tipo, valor = excluded.valor,
        activo = excluded.activo, max_usos = excluded.max_usos, vence = excluded.vence
    `;
    return { ok: true };
  });

export const borrarCupon = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ codigo: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from cupones where codigo = ${data.codigo}`;
    return { ok: true };
  });
