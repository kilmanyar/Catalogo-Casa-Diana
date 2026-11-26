import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

export type GastoRow = {
  id: number;
  categoria: string;
  descripcion: string | null;
  monto: string;
  created_by: string | null;
  created_at: string;
};

export const listGastos = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<GastoRow>`select * from gastos order by created_at desc limit 1000`;
  });

const registrarGastoInput = z.object({
  categoria: z.string().trim().min(1).max(100),
  descripcion: z.string().trim().max(2000).optional(),
  monto: z.number().nonnegative(),
});

export const registrarGasto = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => registrarGastoInput.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await sql`
      insert into gastos (categoria, descripcion, monto, created_by)
      values (${data.categoria}, ${data.descripcion ?? null}, ${data.monto}, ${context.adminEmail})
    `;
    return { ok: true };
  });

export const eliminarGasto = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from gastos where id = ${data.id}`;
    return { ok: true };
  });
