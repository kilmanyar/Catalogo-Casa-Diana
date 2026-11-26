import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ajustarStock, listStock, setStockMinimo } from "@/lib/admin/stock";
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

  const minimo = useMutation({
    mutationFn: (vars: { productId: string; minimo: number }) => setStockMinimo({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });

  const resultados = query.length < 2 ? [] : BROWSE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  const exportar = () => {
    if (!stock) return;
    exportToExcel(
      stock.map((s) => ({
        Producto: productById(s.product_id)?.name ?? s.product_id,
        ID: s.product_id,
        Cantidad: s.qty,
        "Stock mínimo": s.stock_minimo,
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
        <input className={fieldClass + " mt-2"} placeholder="Nombre del producto…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  <td className="px-3 py-2 text-xs text-muted">{new Date(s.updated_at).toLocaleString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
