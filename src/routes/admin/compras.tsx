import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listCompras, registrarCompra } from "@/lib/admin/compras";
import { BROWSE_PRODUCTS, money } from "@/lib/catalog";
import { btnOrange, fieldClass } from "@/components/store/ui";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/compras")({ component: AdminCompras });

function AdminCompras() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [qty, setQty] = useState(1);
  const [costo, setCosto] = useState(0);
  const [proveedor, setProveedor] = useState("");

  const { data: compras, isLoading } = useQuery({ queryKey: ["admin", "compras"], queryFn: () => listCompras() });

  const registrar = useMutation({
    mutationFn: () =>
      registrarCompra({
        data: {
          productId: selected!.id,
          productName: selected!.name,
          qty,
          costoUnitario: costo,
          proveedor: proveedor || undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "compras"] });
      qc.invalidateQueries({ queryKey: ["admin", "stock"] });
      setSelected(null);
      setQty(1);
      setCosto(0);
      setProveedor("");
      setQuery("");
    },
  });

  const resultados = query.length < 2 ? [] : BROWSE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  const exportar = () => {
    if (!compras) return;
    exportToExcel(
      compras.map((c) => ({
        Producto: c.product_name,
        Cantidad: c.qty,
        "Costo unitario": Number(c.costo_unitario),
        "Costo total": Number(c.costo_total),
        Proveedor: c.proveedor ?? "",
        Nota: c.nota ?? "",
        "Cargado por": c.created_by,
        Fecha: c.created_at,
      })),
      "compras-casa-diana",
      "Compras",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl text-ink">Compras de mercadería</h1>
        <button type="button" className="h-11 rounded-md bg-navy px-4 text-sm font-semibold text-paper" onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <p className="text-sm font-semibold text-navy">Registrar compra</p>
        <p className="text-xs text-muted">Suma al stock y queda guardado como costo de ese producto.</p>
        <div className="mt-2 flex flex-col gap-2">
          {selected ? (
            <div className="flex items-center justify-between rounded bg-bg px-2 py-1.5 text-sm">
              <span className="truncate">{selected.name}</span>
              <button type="button" className="text-xs text-coral" onClick={() => setSelected(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input className={fieldClass} placeholder="Buscar producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
              {resultados.length > 0 ? (
                <ul className="flex flex-col gap-1 rounded-md bg-bg p-1">
                  {resultados.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1 text-left text-sm hover:bg-paper"
                        onClick={() => setSelected({ id: p.id, name: p.name })}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}

          <div className="flex gap-2">
            <label className="flex-1 text-xs text-muted">
              Cantidad
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className={fieldClass + " mt-1"} />
            </label>
            <label className="flex-1 text-xs text-muted">
              Costo unitario (₲)
              <input type="number" min={0} value={costo} onChange={(e) => setCosto(Number(e.target.value) || 0)} className={fieldClass + " mt-1"} />
            </label>
          </div>
          <input className={fieldClass} placeholder="Proveedor (opcional)" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />

          <p className="text-right text-sm font-semibold text-navy">Total: ₲ {money(qty * costo)}</p>

          <button type="button" disabled={!selected || registrar.isPending} className={btnOrange} onClick={() => registrar.mutate()}>
            {registrar.isPending ? "Guardando…" : "Registrar compra"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : !compras || compras.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay compras registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase text-muted">
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cant.</th>
                <th className="px-3 py-2">Costo unit.</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Proveedor</th>
                <th className="px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-navy">{c.product_name}</td>
                  <td className="px-3 py-2 text-navy">{c.qty}</td>
                  <td className="px-3 py-2 text-navy">₲ {money(Number(c.costo_unitario))}</td>
                  <td className="px-3 py-2 text-navy">₲ {money(Number(c.costo_total))}</td>
                  <td className="px-3 py-2 text-muted">{c.proveedor || "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted">{new Date(c.created_at).toLocaleString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
