import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarLocal, listLocales, stockPorLocal, transferirStock } from "@/lib/admin/locales";
import { productById } from "@/lib/catalog";
import { btnPrimary, fieldClass, selectClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/locales")({ component: AdminLocales });

function AdminLocales() {
  const qc = useQueryClient();
  const { data: locales } = useQuery({ queryKey: ["admin", "locales"], queryFn: () => listLocales() });
  const { data: stock } = useQuery({ queryKey: ["admin", "stock-locales"], queryFn: () => stockPorLocal() });
  const refrescar = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [productId, setProductId] = useState("");
  const [desde, setDesde] = useState(1);
  const [hasta, setHasta] = useState(0);
  const [qty, setQty] = useState("1");
  const [msg, setMsg] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (v: { id: number | null; nombre: string; direccion: string | null; activo: boolean }) => guardarLocal({ data: v }),
    onSuccess: () => { setErr(null); refrescar(); },
    onError: (e) => setErr(e instanceof Error ? e.message : "No se pudo guardar."),
  });
  const mover = useMutation({
    mutationFn: () => transferirStock({ data: { productId, desde, hasta, qty: Number(qty) } }),
    onSuccess: () => { setMsg("Transferencia hecha."); setErr(null); setQty("1"); refrescar(); },
    onError: (e) => { setErr(e instanceof Error ? e.message : "No se pudo transferir."); setMsg(null); },
  });

  const activos = (locales ?? []).filter((l) => l.activo);
  const stockConProducto = useMemo(() => (stock ?? []).filter((s) => s.total !== 0), [stock]);
  const sugerencias = q.trim().length >= 2 && !productId
    ? (stock ?? []).filter((s) => ((productById(s.product_id)?.name ?? "") + " " + s.product_id).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Locales y depósitos</h1>
        <p className="text-sm text-muted">
          Todo el stock cargado empieza en el local Principal. Agregá otro local y transferí unidades; cada pedido se despacha desde un local y descuenta de ese stock al entregarse.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-paper p-4 ring-1 ring-line">
        <p className="text-sm font-semibold text-navy">Agregar local</p>
        <div className="flex flex-wrap gap-2">
          <input className={fieldClass + " max-w-56"} placeholder="Nombre (ej: Local Luque)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className={fieldClass + " max-w-72"} placeholder="Dirección (opcional)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <button type="button" className={btnPrimary} onClick={() => { if (nombre.trim().length >= 2) { guardar.mutate({ id: null, nombre, direccion: direccion || null, activo: true }); setNombre(""); setDireccion(""); } }}>Agregar</button>
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {(locales ?? []).map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-2 text-sm text-navy">
              <span>{l.nombre}{l.direccion ? ` · ${l.direccion}` : ""}{l.activo ? "" : " · inactivo"}</span>
              {l.id !== 1 ? <button type="button" className="text-xs font-semibold text-coral" onClick={() => guardar.mutate({ id: l.id, nombre: l.nombre, direccion: l.direccion, activo: !l.activo })}>{l.activo ? "Desactivar" : "Activar"}</button> : null}
            </li>
          ))}
        </ul>
      </div>

      {activos.length > 1 ? (
        <div className="flex flex-col gap-2 rounded-lg bg-paper p-4 ring-1 ring-line">
          <p className="text-sm font-semibold text-navy">Transferir stock entre locales</p>
          <input className={fieldClass} placeholder="Buscar producto con stock…" value={q} onChange={(e) => { setQ(e.target.value); setProductId(""); }} />
          {sugerencias.length > 0 ? (
            <ul className="max-h-40 overflow-y-auto rounded-md ring-1 ring-line">
              {sugerencias.map((s) => (
                <li key={s.product_id}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg" onClick={() => { setProductId(s.product_id); setQ(productById(s.product_id)?.name ?? s.product_id); }}>{productById(s.product_id)?.name ?? s.product_id}</button></li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <select className={selectClass} aria-label="Desde" value={desde} onChange={(e) => setDesde(Number(e.target.value))}>
              {activos.map((l) => <option key={l.id} value={l.id}>Desde {l.nombre}</option>)}
            </select>
            <select className={selectClass} aria-label="Hasta" value={hasta || activos.find((l) => l.id !== desde)?.id} onChange={(e) => setHasta(Number(e.target.value))}>
              {activos.filter((l) => l.id !== desde).map((l) => <option key={l.id} value={l.id}>Hasta {l.nombre}</option>)}
            </select>
            <input className={fieldClass + " max-w-24"} type="number" min={1} aria-label="Cantidad" value={qty} onChange={(e) => setQty(e.target.value)} />
            <button type="button" className={btnPrimary} disabled={!productId} onClick={() => { if (!hasta) setHasta(activos.find((l) => l.id !== desde)?.id ?? 0); mover.mutate(); }}>Transferir</button>
          </div>
          {msg ? <p className="text-sm font-medium text-cash">{msg}</p> : null}
        </div>
      ) : null}
      {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}

      <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-3 py-2">Producto</th>
              {activos.map((l) => <th key={l.id} className="px-3 py-2">{l.nombre}</th>)}
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {stockConProducto.map((s) => (
              <tr key={s.product_id} className="border-t border-line">
                <td className="px-3 py-2 text-navy">{productById(s.product_id)?.name ?? s.product_id}</td>
                {activos.map((l) => <td key={l.id} className="px-3 py-2">{s.por_local[String(l.id)] ?? 0}</td>)}
                <td className="px-3 py-2 font-semibold">{s.total}</td>
              </tr>
            ))}
            {stockConProducto.length === 0 ? <tr><td className="px-3 py-3 text-muted" colSpan={activos.length + 2}>Todavía no hay stock cargado (usá Stock o Compras).</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
