import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ensureStockRow } from "./require-admin";
import { calcularCupon } from "./cupones";
import { optionalUserMiddleware } from "../cuenta-middleware";

// ── Público (sin auth): se llama desde el carrito al armar el comprobante ──
// Ver src/components/store/cart-drawer.tsx. Registra el pedido como
// "pendiente" / origen "whatsapp" para que el admin lo vea en /admin/pedidos,
// incluso si el cliente termina sin enviar el WhatsApp. No requiere sign-in a
// propósito (es una acción de un cliente anónimo) y nunca expone ni lee datos
// de otros pedidos — solo inserta.

const itemInput = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
});

const registrarPedidoInput = z.object({
  clienteNombre: z.string().trim().max(200).optional(),
  clienteTelefono: z.string().trim().max(50).optional(),
  metodoPago: z.enum(["tarjeta", "efectivo", "transferencia"]).optional(),
  total: z.number().nonnegative(),
  nota: z.string().trim().max(2000).optional(),
  cupon: z.string().trim().max(40).optional(),
  items: z.array(itemInput).min(1).max(100),
});

export const registrarPedidoDesdeCarrito = createServerFn({ method: "POST" })
  .middleware([optionalUserMiddleware])
  .validator((input: unknown) => registrarPedidoInput.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    let descuento = 0;
    let cupon: string | null = null;
    if (data.cupon) {
      try {
        const r = await calcularCupon(data.cupon, data.total);
        if (r.ok) {
          descuento = r.descuento;
          cupon = r.codigo;
        }
      } catch {
        /* sin cupón */
      }
    }
    const totalFinal = Math.max(0, data.total - descuento);
    const rows = await sql<{ id: number }>`
      insert into pedidos (origen, cliente_nombre, cliente_telefono, estado, metodo_pago, total, cupon, descuento, user_id)
      values ('whatsapp', ${data.clienteNombre ?? null}, ${data.clienteTelefono ?? null}, 'pendiente', ${data.metodoPago ?? null}, ${totalFinal}, ${cupon}, ${descuento}, ${context.clienteId})
      returning id
    `;
    const pedidoId = rows[0].id;
    for (const item of data.items) {
      await sql`
        insert into pedido_items (pedido_id, product_id, product_name, qty, precio_unitario, subtotal)
        values (${pedidoId}, ${item.productId}, ${item.productName}, ${item.qty}, ${item.precioUnitario}, ${item.precioUnitario * item.qty})
      `;
    }
    if (cupon) await sql`update cupones set usos = usos + 1 where codigo = ${cupon}`;
    await avisarPedidoNuevo(pedidoId, data.clienteNombre, data.clienteTelefono, totalFinal, data.items.length);
    return { id: pedidoId };
  });

/**
 * Aviso por correo de un pedido nuevo (opcional). Si no están configuradas
 * RESEND_API_KEY y NOTIFY_EMAIL (variables de entorno en Vercel), no hace nada.
 * Nunca rompe el pedido si falla.
 */
async function avisarPedidoNuevo(id: number, nombre: string | undefined, tel: string | undefined, total: number, lineas: number) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || "Casa Diana <onboarding@resend.dev>",
        to: to.split(",").map((e) => e.trim()),
        subject: `Pedido nuevo #${id} — ₲ ${Math.round(total).toLocaleString("es-PY")}`,
        text: `Pedido #${id}\nCliente: ${nombre || "sin nombre"} ${tel || ""}\nProductos: ${lineas}\nTotal: ₲ ${Math.round(total).toLocaleString("es-PY")}\n\nRevisalo en /admin/pedidos`,
      }),
    });
  } catch {
    /* best-effort */
  }
}

// ── Admin (requiere sign-in + allowlist) ──────────────────────────────────

export type PedidoRow = {
  id: number;
  origen: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  estado: string;
  metodo_pago: string | null;
  total: string;
  nota: string | null;
  stock_descontado: boolean;
  entrega_tipo: string;
  direccion: string | null;
  costo_envio: string;
  fecha_entrega: string | null;
  pagado: boolean;
  ruc_ci: string | null;
  factura_nro: string | null;
  cupon: string | null;
  descuento: string;
  created_at: string;
  updated_at: string;
};

export const listPedidos = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ estado: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const pedidos = data.estado
      ? await sql<PedidoRow>`select * from pedidos where estado = ${data.estado} order by created_at desc limit 500`
      : await sql<PedidoRow>`select * from pedidos order by created_at desc limit 500`;
    return pedidos;
  });

export type PedidoItemRow = {
  id: number;
  pedido_id: number;
  product_id: string;
  product_name: string;
  qty: number;
  precio_unitario: string;
  costo_unitario: string | null;
  subtotal: string;
};

export const getPedidoDetalle = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ id: z.number().int() }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const pedido = await sql<PedidoRow>`select * from pedidos where id = ${data.id}`;
    const items = await sql<PedidoItemRow>`select * from pedido_items where pedido_id = ${data.id} order by id`;
    return { pedido: pedido[0] ?? null, items };
  });

const crearPedidoManualInput = z.object({
  clienteNombre: z.string().trim().max(200).optional(),
  clienteTelefono: z.string().trim().max(50).optional(),
  metodoPago: z.enum(["tarjeta", "efectivo", "transferencia"]).optional(),
  nota: z.string().trim().max(2000).optional(),
  entregaTipo: z.enum(["retiro", "delivery"]).optional(),
  direccion: z.string().trim().max(500).optional(),
  costoEnvio: z.number().nonnegative().optional(),
  rucCi: z.string().trim().max(40).optional(),
  items: z.array(itemInput).min(1).max(100),
});

export const crearPedidoManual = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => crearPedidoManualInput.parse(input))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const total = data.items.reduce((s, i) => s + i.precioUnitario * i.qty, 0);
    const rows = await sql<{ id: number }>`
      insert into pedidos (origen, cliente_nombre, cliente_telefono, estado, metodo_pago, total, nota, created_by,
                           entrega_tipo, direccion, costo_envio, ruc_ci)
      values ('manual', ${data.clienteNombre ?? null}, ${data.clienteTelefono ?? null}, 'confirmado', ${data.metodoPago ?? null}, ${total}, ${data.nota ?? null}, ${context.adminEmail},
              ${data.entregaTipo ?? "retiro"}, ${data.direccion ?? null}, ${data.costoEnvio ?? 0}, ${data.rucCi ?? null})
      returning id
    `;
    const pedidoId = rows[0].id;
    for (const item of data.items) {
      await sql`
        insert into pedido_items (pedido_id, product_id, product_name, qty, precio_unitario, subtotal)
        values (${pedidoId}, ${item.productId}, ${item.productName}, ${item.qty}, ${item.precioUnitario}, ${item.precioUnitario * item.qty})
      `;
    }
    return { id: pedidoId };
  });

const ESTADOS = ["pendiente", "confirmado", "entregado", "cancelado"] as const;

export const actualizarEstadoPedido = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) =>
    z.object({ id: z.number().int(), estado: z.enum(ESTADOS) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const current = await sql<PedidoRow>`select * from pedidos where id = ${data.id}`;
    if (current.length === 0) throw new Error("Pedido no encontrado");
    const pedido = current[0];

    await sql`update pedidos set estado = ${data.estado}, updated_at = now() where id = ${data.id}`;

    // Al pasar a "entregado" por primera vez, descuenta stock (idempotente vía
    // stock_descontado). Si se cancela un pedido ya entregado, repone stock.
    if (data.estado === "entregado" && !pedido.stock_descontado) {
      const items = await sql<{ id: number; product_id: string; qty: number }>`
        select id, product_id, qty from pedido_items where pedido_id = ${data.id}
      `;
      for (const item of items) {
        await ensureStockRow(item.product_id);
        await sql`update stock set qty = qty - ${item.qty}, updated_at = now() where product_id = ${item.product_id}`;
        // Fija el costo unitario con la última compra registrada de ese producto
        // (costeo simple, no promedio ponderado) para poder calcular margen real.
        const ultimaCompra = await sql<{ costo_unitario: string }>`
          select costo_unitario from compras where product_id = ${item.product_id}
          order by created_at desc limit 1
        `;
        if (ultimaCompra[0]) {
          await sql`update pedido_items set costo_unitario = ${ultimaCompra[0].costo_unitario} where id = ${item.id}`;
        }
      }
      await sql`update pedidos set stock_descontado = true where id = ${data.id}`;
    } else if (data.estado === "cancelado" && pedido.stock_descontado) {
      const items = await sql<{ product_id: string; qty: number }>`
        select product_id, qty from pedido_items where pedido_id = ${data.id}
      `;
      for (const item of items) {
        await ensureStockRow(item.product_id);
        await sql`update stock set qty = qty + ${item.qty}, updated_at = now() where product_id = ${item.product_id}`;
      }
      await sql`update pedidos set stock_descontado = false where id = ${data.id}`;
    }

    return { ok: true };
  });

// ── Logística / facturación de un pedido ya cargado ─────────────────────────

const logisticaInput = z.object({
  id: z.number().int(),
  clienteNombre: z.string().trim().max(200).nullable(),
  clienteTelefono: z.string().trim().max(50).nullable(),
  entregaTipo: z.enum(["retiro", "delivery"]),
  direccion: z.string().trim().max(500).nullable(),
  costoEnvio: z.number().nonnegative(),
  fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  pagado: z.boolean(),
  metodoPago: z.enum(["tarjeta", "efectivo", "transferencia"]).nullable(),
  rucCi: z.string().trim().max(40).nullable(),
  facturaNro: z.string().trim().max(40).nullable(),
  nota: z.string().trim().max(2000).nullable(),
});

export const actualizarLogistica = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => logisticaInput.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`
      update pedidos set
        cliente_nombre = ${data.clienteNombre || null},
        cliente_telefono = ${data.clienteTelefono || null},
        entrega_tipo = ${data.entregaTipo},
        direccion = ${data.direccion || null},
        costo_envio = ${data.costoEnvio},
        fecha_entrega = ${data.fechaEntrega},
        pagado = ${data.pagado},
        metodo_pago = ${data.metodoPago},
        ruc_ci = ${data.rucCi || null},
        factura_nro = ${data.facturaNro || null},
        nota = ${data.nota || null},
        updated_at = now()
      where id = ${data.id}
    `;
    return { ok: true };
  });

/** Pedidos que todavía hay que entregar (pendientes o confirmados), los más urgentes primero. */
export const listEntregas = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const sql = await getSql();
    return sql<PedidoRow>`
      select * from pedidos
      where estado in ('pendiente', 'confirmado')
      order by fecha_entrega asc nulls last, created_at asc
      limit 500
    `;
  });
