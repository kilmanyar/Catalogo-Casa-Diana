import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarEstadoPedido,
  actualizarEtapa,
  ETAPAS,
  actualizarLogistica,
  crearPedidoManual,
  getPedidoDetalle,
  listPedidos,
} from "@/lib/admin/pedidos";
import { BROWSE_PRODUCTS, money } from "@/lib/catalog";
import { btnOrange, btnPrimary, fieldClass, selectClass } from "@/components/store/ui";
import { ETAPA_LABEL, mensajeEtapa, waLink } from "@/lib/etapas";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/pedidos")({ component: AdminPedidos });

const ESTADOS = ["pendiente", "confirmado", "entregado", "cancelado"] as const;
const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-orange/15 text-orange",
  confirmado: "bg-navy/10 text-navy",
  entregado: "bg-cash/15 text-cash",
  cancelado: "bg-coral/15 text-coral",
};

function AdminPedidos() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [showNuevo, setShowNuevo] = useState(false);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["admin", "pedidos", filtro],
    queryFn: () => listPedidos({ data: { estado: filtro || undefined } }),
  });

  const cambiarEstado = useMutation({
    mutationFn: (vars: { id: number; estado: (typeof ESTADOS)[number] }) =>
      actualizarEstadoPedido({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "pedidos"] }),
  });

  const exportar = () => {
    if (!pedidos) return;
    exportToExcel(
      pedidos.map((p) => ({
        ID: p.id,
        Origen: p.origen,
        Entrega: p.entrega_tipo,
        Dirección: p.direccion ?? "",
        "Fecha de entrega": p.fecha_entrega ?? "",
        Pagado: p.pagado ? "Sí" : "No",
        "RUC/CI": p.ruc_ci ?? "",
        "N° factura": p.factura_nro ?? "",
        Envío: Number(p.costo_envio),
        Cliente: p.cliente_nombre ?? "",
        Teléfono: p.cliente_telefono ?? "",
        Estado: ESTADO_LABEL[p.estado] ?? p.estado,
        "Método de pago": p.metodo_pago ?? "",
        Total: Number(p.total),
        Fecha: p.created_at,
      })),
      "pedidos-casa-diana",
      "Pedidos",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl text-ink">Pedidos</h1>
        <div className="flex items-center gap-2">
          <select className={selectClass} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
          <button type="button" className={btnPrimary} onClick={exportar}>
            Exportar Excel
          </button>
          <button type="button" className={btnOrange} onClick={() => setShowNuevo(true)}>
            Cargar pedido
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : !pedidos || pedidos.length === 0 ? (
        <p className="text-sm text-muted">No hay pedidos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase text-muted">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Entrega</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium text-navy">{p.id}</td>
                  <td className="px-3 py-2 text-navy">{p.cliente_nombre || "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {p.entrega_tipo === "delivery" ? "Delivery" : "Retiro"}
                    {p.pagado ? " · pagado" : ""}
                  </td>
                  <td className="px-3 py-2 text-navy">₲ {money(Number(p.total))}</td>
                  <td className="px-3 py-2">
                    <select
                      className={"rounded-md px-2 py-1 text-xs font-semibold " + ESTADO_COLOR[p.estado]}
                      value={p.estado}
                      onChange={(e) =>
                        cambiarEstado.mutate({ id: p.id, estado: e.target.value as (typeof ESTADOS)[number] })
                      }
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_LABEL[e]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {new Date(p.created_at).toLocaleString("es-PY")}
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-xs font-semibold text-navy underline" onClick={() => setOpenId(p.id)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId !== null ? <DetallePedido id={openId} onClose={() => setOpenId(null)} /> : null}
      {showNuevo ? <NuevoPedido onClose={() => setShowNuevo(false)} /> : null}
    </div>
  );
}

function abrirRecibo(
  pedido: NonNullable<Awaited<ReturnType<typeof getPedidoDetalle>>["pedido"]>,
  items: { product_name: string; qty: number; precio_unitario: string; subtotal: string }[],
) {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const envio = Number(pedido.costo_envio);
  const total = Number(pedido.total) + envio;
  const filas = items
    .map(
      (it) =>
        `<tr><td>${it.qty} × ${esc(it.product_name)}</td><td class="r">₲ ${money(Number(it.precio_unitario))}</td><td class="r">₲ ${money(Number(it.subtotal))}</td></tr>`,
    )
    .join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo #${pedido.id}</title>
<style>body{font:14px system-ui,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;color:#222}
h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left}
.r{text-align:right}.t td{font-weight:700;border-bottom:0}.m{color:#666;font-size:12px}@media print{button{display:none}}</style></head><body>
<h1>Casa Diana</h1><p class="m">Perfumes, belleza y accesorios · Lambaré · WhatsApp 0986 540 105</p>
<p><b>Recibo / Pedido #${pedido.id}</b>${pedido.factura_nro ? ` · Factura N° ${esc(pedido.factura_nro)}` : ""}<br>
Fecha: ${new Date(pedido.created_at).toLocaleDateString("es-PY")}<br>
Cliente: ${esc(pedido.cliente_nombre || "—")}${pedido.cliente_telefono ? ` · ${esc(pedido.cliente_telefono)}` : ""}<br>
RUC / CI: ${esc(pedido.ruc_ci || "—")}<br>
Entrega: ${pedido.entrega_tipo === "delivery" ? `Delivery — ${esc(pedido.direccion || "")}` : "Retiro en Lambaré"}<br>
Pago: ${esc(pedido.metodo_pago || "—")} · ${pedido.pagado ? "Pagado" : "Pendiente de pago"}</p>
<table><tr><th>Detalle</th><th class="r">Precio</th><th class="r">Subtotal</th></tr>${filas}
${envio > 0 ? `<tr><td>Envío</td><td></td><td class="r">₲ ${money(envio)}</td></tr>` : ""}
<tr class="t"><td>Total</td><td></td><td class="r">₲ ${money(total)}</td></tr></table>
<p class="m">Gracias por tu compra. Garantía por defecto de fábrica.</p><button onclick="print()">Imprimir</button></body></html>`);
  w.document.close();
}

function DetallePedido({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "pedido", id],
    queryFn: () => getPedidoDetalle({ data: { id } }),
  });
  const p = data?.pedido ?? null;
  const [f, setF] = useState<null | {
    cliente: string;
    telefono: string;
    entrega: "retiro" | "delivery";
    direccion: string;
    envio: number;
    fecha: string;
    pagado: boolean;
    metodo: "" | "tarjeta" | "efectivo" | "transferencia" | "tokefon" | "qr";
    ruc: string;
    factura: string;
    nota: string;
  }>(null);
  if (p && !f) {
    setF({
      cliente: p.cliente_nombre ?? "",
      telefono: p.cliente_telefono ?? "",
      entrega: p.entrega_tipo === "delivery" ? "delivery" : "retiro",
      direccion: p.direccion ?? "",
      envio: Number(p.costo_envio),
      fecha: p.fecha_entrega ? p.fecha_entrega.slice(0, 10) : "",
      pagado: p.pagado,
      metodo: (p.metodo_pago as "tarjeta" | "efectivo" | "transferencia" | "tokefon" | "qr" | null) ?? "",
      ruc: p.ruc_ci ?? "",
      factura: p.factura_nro ?? "",
      nota: p.nota ?? "",
    });
  }

  const guardar = useMutation({
    mutationFn: () =>
      actualizarLogistica({
        data: {
          id,
          clienteNombre: f!.cliente || null,
          clienteTelefono: f!.telefono || null,
          entregaTipo: f!.entrega,
          direccion: f!.direccion || null,
          costoEnvio: f!.envio,
          fechaEntrega: f!.fecha || null,
          pagado: f!.pagado,
          metodoPago: f!.metodo || null,
          rucCi: f!.ruc || null,
          facturaNro: f!.factura || null,
          nota: f!.nota || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });

  const etapaM = useMutation({
    mutationFn: (etapa: (typeof ETAPAS)[number]) => actualizarEtapa({ data: { id, etapa } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const [etapaSel, setEtapaSel] = useState<string | null>(null);
  const etapa = etapaSel ?? p?.etapa ?? "recibido";

  const set = <K extends keyof NonNullable<typeof f>>(k: K, v: NonNullable<typeof f>[K]) => setF((prev) => (prev ? { ...prev, [k]: v } : prev));
  const label = "text-xs font-semibold uppercase text-muted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Pedido #{id}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cerrar
          </button>
        </div>
        {!data || !p || !f ? (
          <p className="mt-3 text-sm text-muted">Cargando…</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 text-sm">
            <ul className="flex flex-col gap-2 rounded-md bg-bg p-2">
              {data.items.map((it, i) => (
                <li key={i} className="flex justify-between text-navy">
                  <span>
                    {it.qty} × {it.product_name}
                  </span>
                  <span>₲ {money(Number(it.subtotal))}</span>
                </li>
              ))}
              {f.envio > 0 ? (
                <li className="flex justify-between text-navy">
                  <span>Envío</span>
                  <span>₲ {money(f.envio)}</span>
                </li>
              ) : null}
              <li className="flex justify-between border-t border-line pt-2 font-semibold text-navy">
                <span>Total</span>
                <span>₲ {money(Number(p.total) + f.envio)}</span>
              </li>
            </ul>

            <label className="flex flex-col gap-1">
              <span className={label}>Cliente</span>
              <input className={fieldClass} value={f.cliente} onChange={(e) => set("cliente", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Teléfono</span>
              <input className={fieldClass} value={f.telefono} onChange={(e) => set("telefono", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Entrega</span>
              <select className={selectClass} value={f.entrega} onChange={(e) => set("entrega", e.target.value as "retiro" | "delivery")}>
                <option value="retiro">Retiro en Lambaré</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            {f.entrega === "delivery" ? (
              <>
                <label className="flex flex-col gap-1">
                  <span className={label}>Dirección</span>
                  <input className={fieldClass} value={f.direccion} onChange={(e) => set("direccion", e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={label}>Costo de envío (₲)</span>
                  <input className={fieldClass} type="number" min={0} value={f.envio} onChange={(e) => set("envio", Math.max(0, Number(e.target.value) || 0))} />
                </label>
              </>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className={label}>Seguimiento (lo ve el cliente)</span>
              <div className="flex gap-2">
                <select
                  className={selectClass + " flex-1"}
                  value={etapa}
                  onChange={(e) => {
                    setEtapaSel(e.target.value);
                    etapaM.mutate(e.target.value as (typeof ETAPAS)[number]);
                  }}
                >
                  {ETAPAS.map((e) => <option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
                </select>
                {f.telefono ? (
                  <a className={btnPrimary} target="_blank" rel="noreferrer" href={waLink(f.telefono, mensajeEtapa(id, f.cliente || null, etapa, f.entrega))}>
                    Avisar por WhatsApp
                  </a>
                ) : null}
              </div>
            </div>
            <label className="flex flex-col gap-1">
              <span className={label}>Fecha de entrega</span>
              <input className={fieldClass} type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Método de pago</span>
              <select className={selectClass} value={f.metodo} onChange={(e) => set("metodo", e.target.value as typeof f.metodo)}>
                <option value="">—</option>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="tokefon">Tokefon (tarjeta/QR en persona)</option>
                <option value="qr">QR</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-navy">
              <input type="checkbox" checked={f.pagado} onChange={(e) => set("pagado", e.target.checked)} /> Pedido pagado
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>RUC / CI</span>
              <input className={fieldClass} value={f.ruc} onChange={(e) => set("ruc", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>N° de factura</span>
              <input className={fieldClass} value={f.factura} onChange={(e) => set("factura", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Nota</span>
              <input className={fieldClass} value={f.nota} onChange={(e) => set("nota", e.target.value)} />
            </label>

            <div className="flex gap-2">
              <button type="button" className={btnOrange + " flex-1"} disabled={guardar.isPending} onClick={() => guardar.mutate()}>
                {guardar.isPending ? "Guardando…" : guardar.isSuccess ? "Guardado ✓" : "Guardar cambios"}
              </button>
              <button type="button" className={btnPrimary} onClick={() => abrirRecibo({ ...p, costo_envio: String(f.envio), entrega_tipo: f.entrega, direccion: f.direccion, ruc_ci: f.ruc, factura_nro: f.factura, pagado: f.pagado, metodo_pago: f.metodo || null, cliente_nombre: f.cliente, cliente_telefono: f.telefono }, data.items)}>
                Recibo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NuevoPedido({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [query, setQuery] = useState("");
  const [entrega, setEntrega] = useState<"retiro" | "delivery">("retiro");
  const [direccion, setDireccion] = useState("");
  const [envio, setEnvio] = useState(0);
  const [ruc, setRuc] = useState("");
  const [items, setItems] = useState<{ productId: string; productName: string; qty: number; precioUnitario: number }[]>([]);

  const crear = useMutation({
    mutationFn: () =>
      crearPedidoManual({
        data: {
          clienteNombre: cliente || undefined,
          clienteTelefono: telefono || undefined,
          entregaTipo: entrega,
          direccion: entrega === "delivery" ? direccion || undefined : undefined,
          costoEnvio: entrega === "delivery" ? envio : undefined,
          rucCi: ruc || undefined,
          items,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pedidos"] });
      onClose();
    },
  });

  const resultados = query.length < 2 ? [] : BROWSE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const total = items.reduce((s, i) => s + i.precioUnitario * i.qty, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Cargar pedido manual</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cerrar
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <input className={fieldClass} placeholder="Nombre del cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <input className={fieldClass} placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className={fieldClass} placeholder="RUC / CI (opcional)" value={ruc} onChange={(e) => setRuc(e.target.value)} />
          <select className={selectClass} value={entrega} onChange={(e) => setEntrega(e.target.value as "retiro" | "delivery")}>
            <option value="retiro">Retiro en Lambaré</option>
            <option value="delivery">Delivery</option>
          </select>
          {entrega === "delivery" ? (
            <>
              <input className={fieldClass} placeholder="Dirección de entrega" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              <input className={fieldClass} type="number" min={0} placeholder="Costo de envío (₲)" value={envio || ""} onChange={(e) => setEnvio(Math.max(0, Number(e.target.value) || 0))} />
            </>
          ) : null}
          <input className={fieldClass} placeholder="Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {resultados.length > 0 ? (
            <ul className="flex flex-col gap-1 rounded-md bg-bg p-1">
              {resultados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-paper"
                    onClick={() => {
                      setItems((prev) => {
                        const existing = prev.find((i) => i.productId === p.id);
                        if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
                        return [...prev, { productId: p.id, productName: p.name, qty: 1, precioUnitario: p.price }];
                      });
                      setQuery("");
                    }}
                  >
                    {p.name} — ₲ {money(p.price)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {items.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {items.map((it) => (
                <li key={it.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1 truncate">{it.productName}</span>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((i) => (i.productId === it.productId ? { ...i, qty: Number(e.target.value) || 1 } : i)),
                      )
                    }
                    className="w-14 rounded border border-line px-1 text-center"
                  />
                  <button
                    type="button"
                    className="text-xs text-coral"
                    onClick={() => setItems((prev) => prev.filter((i) => i.productId !== it.productId))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-2 text-right text-sm font-semibold text-navy">Total: ₲ {money(total)}</p>

          <button
            type="button"
            disabled={items.length === 0 || crear.isPending}
            className={btnOrange + " mt-2"}
            onClick={() => crear.mutate()}
          >
            {crear.isPending ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
