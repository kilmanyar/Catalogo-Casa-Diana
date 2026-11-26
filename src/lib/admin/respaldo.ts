import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware } from "./require-admin";

type Fila = Record<string, string | number | boolean | null>;
const plano = (rows: unknown): Fila[] => JSON.parse(JSON.stringify(rows)) as Fila[];

/** Todo el back office en filas planas, para bajarlo como un Excel de respaldo. */
export const getRespaldo = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const [pedidos, items, stock, compras, gastos] = await Promise.all([
      sql<Record<string, unknown>>`select * from pedidos order by id`,
      sql<Record<string, unknown>>`select * from pedido_items order by id`,
      sql<Record<string, unknown>>`select * from stock order by product_id`,
      sql<Record<string, unknown>>`select * from compras order by id`,
      sql<Record<string, unknown>>`select * from gastos order by id`,
    ]);
    return { pedidos: plano(pedidos), items: plano(items), stock: plano(stock), compras: plano(compras), gastos: plano(gastos) };
  });
