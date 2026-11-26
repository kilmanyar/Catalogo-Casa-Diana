import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { anularFactura, getFacturaConfig, guardarFacturaConfig, listFacturas } from "@/lib/admin/facturacion";
import { abrirFactura } from "@/lib/admin/factura-print";
import { getAccess } from "@/lib/admin/usuarios";
import { exportSheetsToExcel } from "@/lib/admin/xlsx-export";
import { money } from "@/lib/catalog";
import { btnPrimary, fieldClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/facturacion")({ component: AdminFacturacion });

function AdminFacturacion() {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({ queryKey: ["admin", "factura-config"], queryFn: () => getFacturaConfig() });
  const { data: facturas } = useQuery({ queryKey: ["admin", "facturas"], queryFn: () => listFacturas() });
  const { data: acceso } = useQuery({ queryKey: ["admin", "access"], queryFn: () => getAccess() });
  const [f, setF] = useState({ razonSocial: "", ruc: "", direccion: "", telefono: "", timbrado: "", desde: "", hasta: "", est: "001", punto: "001", sig: "1" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (cfg) setF({ razonSocial: cfg.razon_social, ruc: cfg.ruc, direccion: cfg.direccion, telefono: cfg.telefono, timbrado: cfg.timbrado, desde: cfg.vigencia_desde ? String(cfg.vigencia_desde).slice(0, 10) : "", hasta: cfg.vigencia_hasta ? String(cfg.vigencia_hasta).slice(0, 10) : "", est: cfg.establecimiento, punto: cfg.punto, sig: String(cfg.siguiente_numero) });
  }, [cfg]);

  const guardar = useMutation({
    mutationFn: () =>
      guardarFacturaConfig({ data: { razonSocial: f.razonSocial, ruc: f.ruc, direccion: f.direccion, telefono: f.telefono, timbrado: f.timbrado, vigenciaDesde: f.desde || null, vigenciaHasta: f.hasta || null, establecimiento: f.est, punto: f.punto, siguienteNumero: Number(f.sig) || 1 } }),
    onSuccess: () => { setMsg("Datos guardados."); setErr(null); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e) => { setErr(e instanceof Error ? e.message : "No se pudo guardar (¿tenés permiso de dueño? Revisá que establecimiento y punto sean 3 dígitos)."); setMsg(null); },
  });
  const anular = useMutation({ mutationFn: (id: number) => anularFactura({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }) });

  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const isOwner = acceso?.isOwner ?? false;

  const libro = () => {
    if (!facturas || !cfg) return;
    exportSheetsToExcel(
      {
        "Libro IVA ventas": facturas.map((x) => ({
          Fecha: new Date(x.fecha).toLocaleDateString("es-PY"),
          Número: x.numero,
          Estado: x.estado,
          Cliente: x.cliente_nombre,
          "RUC/CI": x.ruc_ci,
          "Gravada 10% (sin IVA)": x.estado === "anulada" ? 0 : Number(x.total) - Number(x.iva10),
          "IVA 10%": x.estado === "anulada" ? 0 : Number(x.iva10),
          Total: x.estado === "anulada" ? 0 : Number(x.total),
        })),
      },
      "libro-iva-ventas",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Facturación</h1>
        <p className="rounded-md bg-orange/10 p-2 text-xs text-navy ring-1 ring-orange/30">
          Emite facturas numeradas con tu timbrado (IVA 10% incluido) y arma el libro de IVA ventas. <b>No es facturación electrónica (SIFEN)</b>: no firma ni envía documentos a la SET. Consultá con tu contador que tu timbrado permita imprimir estas facturas.
        </p>
      </div>

      <div className="grid gap-2 rounded-lg bg-paper p-4 ring-1 ring-line sm:grid-cols-2">
        <input className={fieldClass} placeholder="Razón social" aria-label="Razón social" value={f.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} disabled={!isOwner} />
        <input className={fieldClass} placeholder="RUC (ej: 1234567-8)" aria-label="RUC" value={f.ruc} onChange={(e) => set("ruc", e.target.value)} disabled={!isOwner} />
        <input className={fieldClass} placeholder="Dirección" aria-label="Dirección" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} disabled={!isOwner} />
        <input className={fieldClass} placeholder="Teléfono" aria-label="Teléfono" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} disabled={!isOwner} />
        <input className={fieldClass} placeholder="N° de timbrado" aria-label="Timbrado" value={f.timbrado} onChange={(e) => set("timbrado", e.target.value)} disabled={!isOwner} />
        <div className="flex gap-2">
          <input className={fieldClass} type="date" aria-label="Vigencia desde" value={f.desde} onChange={(e) => set("desde", e.target.value)} disabled={!isOwner} />
          <input className={fieldClass} type="date" aria-label="Vigencia hasta" value={f.hasta} onChange={(e) => set("hasta", e.target.value)} disabled={!isOwner} />
        </div>
        <div className="flex gap-2">
          <input className={fieldClass} placeholder="Establ. 001" aria-label="Establecimiento" value={f.est} onChange={(e) => set("est", e.target.value)} disabled={!isOwner} />
          <input className={fieldClass} placeholder="Punto 001" aria-label="Punto de expedición" value={f.punto} onChange={(e) => set("punto", e.target.value)} disabled={!isOwner} />
          <input className={fieldClass} inputMode="numeric" placeholder="Próx. N°" aria-label="Próximo número" value={f.sig} onChange={(e) => set("sig", e.target.value)} disabled={!isOwner} />
        </div>
        {isOwner ? <button type="button" className={btnPrimary} onClick={() => guardar.mutate()}>Guardar datos</button> : <p className="text-xs text-muted">Solo el dueño edita estos datos.</p>}
        {msg ? <p className="text-sm font-medium text-cash">{msg}</p> : null}
        {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-navy">Facturas emitidas</h2>
        <button type="button" className={btnPrimary} onClick={libro} disabled={!facturas?.length}>Exportar libro IVA</button>
      </div>
      {facturas && facturas.length === 0 ? <p className="text-sm text-muted">Todavía no emitiste facturas. Se emiten desde el detalle de cada pedido.</p> : null}
      <ul className="flex flex-col gap-2">
        {(facturas ?? []).map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper p-3 ring-1 ring-line">
            <div>
              <p className="text-sm font-semibold text-navy">{x.numero}{x.estado === "anulada" ? " · ANULADA" : ""}</p>
              <p className="text-xs text-muted">{new Date(x.fecha).toLocaleDateString("es-PY")} · {x.cliente_nombre} · ₲ {money(Number(x.total))} · IVA ₲ {money(Number(x.iva10))}</p>
            </div>
            <div className="flex gap-2">
              {cfg ? <button type="button" className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy" onClick={() => abrirFactura(x, cfg)}>Ver</button> : null}
              {isOwner && x.estado !== "anulada" ? <button type="button" className="rounded-md bg-coral/15 px-3 py-1.5 text-sm font-semibold text-coral" onClick={() => anular.mutate(x.id)}>Anular</button> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
