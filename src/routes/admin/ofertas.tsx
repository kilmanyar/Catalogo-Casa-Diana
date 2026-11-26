import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { borrarOferta, guardarOferta, listOfertasAdmin } from "@/lib/admin/ofertas";
import { PRODUCTS, money, productById } from "@/lib/catalog";
import { btnPrimary, fieldClass, selectClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/ofertas")({ component: AdminOfertas });

const ETIQUETAS = { oferta: "Oferta", nuevo: "Nuevo", mas_vendido: "Más vendido" } as const;

function AdminOfertas() {
  const qc = useQueryClient();
  const { data: ofertas } = useQuery({ queryKey: ["admin", "ofertas"], queryFn: () => listOfertasAdmin() });
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState("");
  const [etiqueta, setEtiqueta] = useState<keyof typeof ETIQUETAS>("oferta");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (v: { productId: string; etiqueta: keyof typeof ETIQUETAS; precioOferta: number | null; activo: boolean }) => guardarOferta({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ofertas"] }),
  });
  const borrar = useMutation({
    mutationFn: (id: string) => borrarOferta({ data: { productId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ofertas"] }),
  });

  const sugerencias = q.trim().length >= 2
    ? PRODUCTS.filter((p) => (p.name + " " + p.id).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];
  const elegido = productId ? productById(productId) : undefined;

  const agregar = () => {
    setError(null);
    if (!elegido) return setError("Elegí un producto de la lista.");
    const p = precio.trim() ? Number(precio.replace(/\D/g, "")) : null;
    if (etiqueta === "oferta" && (!p || p <= 0)) return setError("Para una oferta cargá el precio de oferta (precio tarjeta).");
    guardar.mutate({ productId: elegido.id, etiqueta, precioOferta: etiqueta === "oferta" ? p : null, activo: true });
    setProductId(""); setQ(""); setPrecio("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Ofertas y destacados</h1>
        <p className="text-sm text-muted">Marcá productos como "Oferta" (con precio rebajado), "Nuevo" o "Más vendido". Se ven al instante en la tienda. El precio de oferta es el precio con tarjeta; en efectivo se descuenta igual que siempre.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
        <input className={fieldClass} placeholder="Buscar producto por nombre o código…" value={q} onChange={(e) => { setQ(e.target.value); setProductId(""); }} />
        {sugerencias.length > 0 && !elegido ? (
          <ul className="max-h-48 overflow-y-auto rounded-md ring-1 ring-line">
            {sugerencias.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg" onClick={() => { setProductId(p.id); setQ(p.name); }}>
                  {p.name} <span className="text-muted">· ₲ {money(p.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <select className={selectClass} value={etiqueta} onChange={(e) => setEtiqueta(e.target.value as keyof typeof ETIQUETAS)}>
            {Object.entries(ETIQUETAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {etiqueta === "oferta" ? (
            <input className={fieldClass + " max-w-48"} inputMode="numeric" placeholder="Precio de oferta ₲" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          ) : null}
          <button type="button" className={btnPrimary} onClick={agregar}>Agregar</button>
        </div>
        {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
      </div>

      <ul className="flex flex-col gap-2">
        {(ofertas ?? []).length === 0 ? <li className="text-sm text-muted">Todavía no hay ofertas ni destacados.</li> : null}
        {(ofertas ?? []).map((o) => {
          const p = productById(o.product_id);
          return (
            <li key={o.product_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper p-3 ring-1 ring-line">
              <div>
                <p className="text-sm font-semibold text-navy">{p?.name ?? o.product_id}</p>
                <p className="text-xs text-muted">
                  {ETIQUETAS[o.etiqueta as keyof typeof ETIQUETAS] ?? o.etiqueta}
                  {o.precio_oferta ? ` · ₲ ${money(Number(o.precio_oferta))} (antes ₲ ${money(p?.price ?? 0)})` : ""}
                  {o.activo ? "" : " · pausada"}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy"
                  onClick={() => guardar.mutate({ productId: o.product_id, etiqueta: o.etiqueta as keyof typeof ETIQUETAS, precioOferta: o.precio_oferta ? Number(o.precio_oferta) : null, activo: !o.activo })}>
                  {o.activo ? "Pausar" : "Activar"}
                </button>
                <button type="button" className="rounded-md bg-coral/15 px-3 py-1.5 text-sm font-semibold text-coral" onClick={() => borrar.mutate(o.product_id)}>Quitar</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
