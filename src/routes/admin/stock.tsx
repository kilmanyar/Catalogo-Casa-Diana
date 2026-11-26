import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ajustarStock, listMermas, listStock, registrarMerma, setCodigoBarras, setStockMinimo } from "@/lib/admin/stock";
import { BROWSE_PRODUCTS, productById } from "@/lib/catalog";
import { fieldClass } from "@/components/store/ui";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/stock")({ component: AdminStock });

function AdminStock() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const { data: stock, isLoading } = useQuery({ queryKey: ["admin", "stock"], queryFn: () => listStock() });

  const ajustar = useMutation({
    mutationFn: (vars: { productId: string; qty: number }) => ajustarStock({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "stock"] }),
  });

  const { data: mermas } = useQuery({ queryKey: ["admin", "mermas"], queryFn: () => listMermas() });
  const [mermaFor, setMermaFor] = useState<string | null>(null);
  const [mermaQty, setMermaQty] = useState("1");
  const [mermaMotivo, setMermaMotivo] = useState("");
  const [mermaError, setMermaError] = useState<string | null>(null);
  const merma = useMutation({
    mutationFn: (vars: { productId: string; qty: number; motivo: string }) => registrarMerma({ data: vars }),
    onSuccess: () => {
      setMermaFor(null);
      setMermaMotivo("");
      setMermaQty("1");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setMermaError("No se pudo registrar la merma."),
  });
  const barras = useMutation({
    mutationFn: (vars: { productId: string; codigo: string }) => setCodigoBarras({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "stock"] }),
  });

  const minimo = useMutation({
    mutationFn: (vars: { productId: string; minimo: number }) => setStockMinimo({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  // Lector de código de barras: escribe el código y manda Enter. Busca por nombre, ID o código de barras.
  const q = query.trim().toLowerCase();
  const porBarras = q ? (stock ?? []).filter((s) => s.codigo_barras && s.codigo_barras.toLowerCase() === q).map((s) => s.product_id) : [];
  const resultados =
    q.length < 2
      ? []
      : BROWSE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase() === q || porBarras.includes(p.id)).slice(0, 8);

  const exportar = () => {
    if (!stock) return;
    exportToExcel(
      stock.map((s) => ({
        Producto: productById(s.product_id)?.name ?? s.product_id,
        ID: s.product_id,
        Cantidad: s.qty,
        "Stock mínimo": s.stock_minimo,
        "Código de barras": s.codigo_barras ?? "",
        "Última actualización": s.updated_at,
      })),
      "stock-casa-diana",
      "Stock",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl text-ink">Stock</h1>
        <button type="button" className="h-11 rounded-md bg-navy px-4 text-sm font-semibold text-paper" onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <p className="text-sm font-semibold text-navy">Buscar producto para ajustar stock</p>
        <input className={fieldClass + " mt-2"} placeholder="Nombre, código o escanear código de barras…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {resultados.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {resultados.map((p) => {
              const current = stock?.find((s) => s.product_id === p.id)?.qty ?? 0;
              return (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded bg-bg px-2 py-1.5 text-sm">
                  <span className="flex-1 truncate">{p.name}</span>
                  <input
                    type="number"
                    defaultValue={current}
                    className="w-20 rounded border border-line px-1 text-center"
                    onBlur={(e) => {
                      const qty = Number(e.target.value);
                      if (!Number.isNaN(qty)) ajustar.mutate({ productId: p.id, qty });
                    }}
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : !stock || stock.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay productos con stock cargado. Registrá una compra o ajustá uno de arriba para empezar.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase text-muted">
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Cantidad</th>
                <th className="px-3 py-2">Mínimo (alerta)</th>
                <th className="px-3 py-2">Código de barras</th>
                <th className="px-3 py-2">Merma</th>
                <th className="px-3 py-2">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.product_id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-navy">{productById(s.product_id)?.name ?? s.product_id}</td>
                  <td className={"px-3 py-2 font-semibold " + (s.qty <= 0 || (s.stock_minimo > 0 && s.qty <= s.stock_minimo) ? "text-coral" : "text-navy")}>{s.qty}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={s.stock_minimo}
                      className="w-16 rounded border border-line px-1 text-center"
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isInteger(v) && v >= 0 && v !== s.stock_minimo) minimo.mutate({ productId: s.product_id, minimo: v });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      defaultValue={s.codigo_barras ?? ""}
                      className="w-32 rounded border border-line px-1"
                      placeholder="Escanear…"
                      onBlur={(e) => {
                        if (e.target.value.trim() !== (s.codigo_barras ?? "")) barras.mutate({ productId: s.product_id, codigo: e.target.value });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="rounded bg-coral/15 px-2 py-1 text-xs font-semibold text-coral" onClick={() => { setMermaFor(s.product_id); setMermaError(null); }}>
                      Registrar
                    </button>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{new Date(s.updated_at).toLocaleString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mermaFor ? (
        <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
          <p className="text-sm font-semibold text-navy">Merma: {productById(mermaFor)?.name ?? mermaFor}</p>
          <p className="text-xs text-muted">Rotura, vencimiento, pérdida o muestra. Descuenta del stock y queda registrada.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className={fieldClass + " max-w-24"} type="number" min={1} value={mermaQty} onChange={(e) => setMermaQty(e.target.value)} aria-label="Cantidad" />
            <input className={fieldClass + " max-w-72 flex-1"} placeholder="Motivo (ej: roto, vencido, muestra)" value={mermaMotivo} onChange={(e) => setMermaMotivo(e.target.value)} />
            <button
              type="button"
              className="h-11 rounded-md bg-navy px-4 text-sm font-semibold text-paper"
              onClick={() => {
                const qty = Number(mermaQty);
                if (!Number.isInteger(qty) || qty < 1 || mermaMotivo.trim().length < 2) return setMermaError("Completá cantidad y motivo.");
                merma.mutate({ productId: mermaFor, qty, motivo: mermaMotivo });
              }}
            >
              Guardar merma
            </button>
            <button type="button" className="h-11 px-3 text-sm text-muted" onClick={() => setMermaFor(null)}>Cancelar</button>
          </div>
          {mermaError ? <p className="mt-1 text-sm font-medium text-coral">{mermaError}</p> : null}
        </div>
      ) : null}

      {mermas && mermas.length > 0 ? (
        <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
          <h2 className="font-display text-lg text-navy">Últimas mermas</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-navy">
            {mermas.slice(0, 15).map((m) => (
              <li key={m.id}>
                {new Date(m.created_at).toLocaleDateString("es-PY")} · {productById(m.product_id)?.name ?? m.product_id} · −{m.qty} · {m.motivo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
