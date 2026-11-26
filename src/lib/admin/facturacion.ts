import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ForbiddenError } from "./require-admin";

export type FacturaConfig = {
  razon_social: string; ruc: string; direccion: string; telefono: string; timbrado: string;
  vigencia_desde: string | null; vigencia_hasta: string | null; establecimiento: string; punto: string; siguiente_numero: number;
};
export type FacturaRow = {
  id: number; pedido_id: number; numero: string; fecha: string; cliente_nombre: string; ruc_ci: string;
  total: string; iva10: string; detalle: { items: { nombre: string; qty: number; precio: number; subtotal: number }[]; envio: number; descuento: number }; estado: string;
};

const RUC_GENERICO = "44444401-7"; // RUC genérico para "sin nombre" / consumidor final

export const getFacturaConfig = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    const r = await sql<FacturaConfig>`select * from facturacion_config where id = 1`;
    return r[0];
  });

const configInput = z.object({
  razonSocial: z.string().trim().max(200),
  ruc: z.string().trim().max(30),
  direccion: z.string().trim().max(300),
  telefono: z.string().trim().max(40),
  timbrado: z.string().trim().max(20),
  vigenciaDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  vigenciaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  establecimiento: z.string().regex(/^\d{3}$/),
  punto: z.string().regex(/^\d{3}$/),
  siguienteNumero: z.number().int().positive(),
});

export const guardarFacturaConfig = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => configInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.isOwner) throw new ForbiddenError();
    const sql = await getSql();
    await sql`
      update facturacion_config set razon_social = ${data.razonSocial}, ruc = ${data.ruc}, direccion = ${data.direccion}, telefono = ${data.telefono},
        timbrado = ${data.timbrado}, vigencia_desde = ${data.vigenciaDesde}, vigencia_hasta = ${data.vigenciaHasta},
        establecimiento = ${data.establecimiento}, punto = ${data.punto}, siguiente_numero = ${data.siguienteNumero} where id = 1
    `;
    return { ok: true };
  });

export const listFacturas = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<FacturaRow>`select * from facturas order by id desc limit 500`;
  });

export const getFacturaDePedido = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ pedidoId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const f = await sql<FacturaRow>`select * from facturas where pedido_id = ${data.pedidoId}`;
    const c = await sql<FacturaConfig>`select * from facturacion_config where id = 1`;
    return { factura: f[0] ?? null, config: c[0] };
  });

/** Emite la factura de un pedido con el siguiente número del talonario. Una sola factura por pedido. */
export const emitirFactura = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ pedidoId: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const cfg = (await sql<FacturaConfig>`select * from facturacion_config where id = 1`)[0];
    if (!cfg.ruc || !cfg.razon_social || !cfg.timbrado || !cfg.vigencia_hasta) {
      throw new Error("Primero completá los datos de facturación (razón social, RUC, timbrado y vigencia) en Facturación.");
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (String(cfg.vigencia_hasta).slice(0, 10) < hoy || (cfg.vigencia_desde && String(cfg.vigencia_desde).slice(0, 10) > hoy)) {
      throw new Error("El timbrado está fuera de su fecha de vigencia.");
    }
    const existente = await sql<{ id: number }>`select id from facturas where pedido_id = ${data.pedidoId}`;
    if (existente.length > 0) throw new Error("Este pedido ya tiene factura.");
    const pr = await sql<{ id: number; estado: string; total: string; cliente_nombre: string | null; ruc_ci: string | null; costo_envio: string; descuento: string }>`
      select id, estado, total, cliente_nombre, ruc_ci, costo_envio, descuento from pedidos where id = ${data.pedidoId}
    `;
    const p = pr[0];
    if (!p) throw new Error("Pedido no encontrado.");
    if (p.estado === "cancelado") throw new Error("No se factura un pedido cancelado.");
    const items = await sql<{ product_name: string; qty: number; precio_unitario: string; subtotal: string }>`
      select product_name, qty, precio_unitario, subtotal from pedido_items where pedido_id = ${p.id} order by id
    `;
    const envio = Number(p.costo_envio);
    const total = Number(p.total) + envio;
    const iva10 = Math.round(total / 11);
    const n = await sql<{ numero: number }>`update facturacion_config set siguiente_numero = siguiente_numero + 1 where id = 1 returning siguiente_numero - 1 as numero`;
    const numero = `${cfg.establecimiento}-${cfg.punto}-${String(n[0].numero).padStart(7, "0")}`;
    const detalle = {
      items: items.map((i) => ({ nombre: i.product_name, qty: i.qty, precio: Number(i.precio_unitario), subtotal: Number(i.subtotal) })),
      envio,
      descuento: Number(p.descuento),
    };
    await sql`
      insert into facturas (pedido_id, numero, cliente_nombre, ruc_ci, total, iva10, detalle)
      values (${p.id}, ${numero}, ${p.cliente_nombre || "Sin nombre"}, ${p.ruc_ci || RUC_GENERICO}, ${total}, ${iva10}, ${JSON.stringify(detalle)}::jsonb)
    `;
    await sql`update pedidos set factura_nro = ${numero}, updated_at = now() where id = ${p.id}`;
    return { numero };
  });

export const anularFactura = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int() }).parse(input))
  .handler(async ({ data, context }) => {
    if (!context.isOwner) throw new ForbiddenError();
    const sql = await getSql();
    await sql`update facturas set estado = 'anulada' where id = ${data.id}`;
    return { ok: true };
  });
