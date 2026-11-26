import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { consultarPedido, type Seguimiento } from "@/lib/seguimiento";
import { ETAPA_LABEL, ETAPA_ORDEN } from "@/lib/etapas";
import { btnPrimary, fieldClass } from "@/components/store/ui";

export const Route = createFileRoute("/seguimiento")({
  component: SeguimientoPage,
  head: () => ({ meta: [{ title: "Seguimiento de pedido — Casa Diana" }] }),
});

function SeguimientoPage() {
  const [id, setId] = useState("");
  const [tel, setTel] = useState("");
  const [res, setRes] = useState<Seguimiento | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(id.replace(/\D/g, ""));
    if (!n) return;
    setBusy(true);
    try {
      setRes(await consultarPedido({ data: { id: n, telefono: tel } }));
    } catch {
      setRes(null);
    } finally {
      setBusy(false);
    }
  };

  const cancelado = res?.estado === "cancelado";
  const actual = res ? (res.estado === "entregado" ? "entregado" : res.etapa) : "";
  const idx = ETAPA_ORDEN.indexOf(actual);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-bg px-4 py-8">
      <Link to="/" className="text-sm font-semibold text-navy underline">← Volver a la tienda</Link>
      <h1 className="font-display text-2xl text-ink">Seguimiento de tu pedido</h1>
      <p className="text-sm text-muted">Ingresá el número de pedido y el teléfono con el que lo hiciste.</p>
      <form onSubmit={buscar} className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-navy">N.º de pedido</span>
          <input className={fieldClass} inputMode="numeric" value={id} onChange={(e) => setId(e.target.value)} placeholder="Ej: 12" required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-navy">Teléfono</span>
          <input className={fieldClass} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="0981 123 456" required />
        </label>
        <button className={btnPrimary} disabled={busy}>{busy ? "Buscando…" : "Ver estado"}</button>
      </form>

      {res === null ? <p role="alert" className="text-sm font-medium text-coral">No encontramos un pedido con esos datos. Revisá el número y el teléfono.</p> : null}
      {res ? (
        <section className="rounded-lg bg-paper p-4 ring-1 ring-line">
          <p className="font-semibold text-navy">Pedido #{res.id}</p>
          <p className="text-xs text-muted">{new Date(res.fecha).toLocaleDateString("es-PY")}{res.fechaEntrega ? ` · Entrega prevista: ${res.fechaEntrega}` : ""}</p>
          {cancelado ? (
            <p className="mt-3 text-sm font-semibold text-coral">Este pedido fue cancelado.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {ETAPA_ORDEN.filter((e) => e !== "en_camino" || res.entregaTipo === "delivery").map((e) => {
                const done = ETAPA_ORDEN.indexOf(e) <= idx;
                return (
                  <li key={e} className={"flex items-center gap-2 text-sm " + (done ? "font-semibold text-navy" : "text-muted")}>
                    <span className={"grid size-5 place-items-center rounded-full text-[11px] " + (done ? "bg-cash text-paper" : "bg-line")}>{done ? "✓" : ""}</span>
                    {ETAPA_LABEL[e]}
                  </li>
                );
              })}
            </ol>
          )}
          <ul className="mt-3 border-t border-line pt-2 text-sm text-navy">
            {res.items.map((i, k) => <li key={k}>{i.qty} × {i.nombre}</li>)}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
