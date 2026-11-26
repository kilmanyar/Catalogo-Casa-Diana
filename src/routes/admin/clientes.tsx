import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listClientes } from "@/lib/admin/clientes";
import { money } from "@/lib/catalog";
import { btnPrimary, fieldClass } from "@/components/store/ui";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/clientes")({ component: AdminClientes });

function AdminClientes() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["admin", "clientes"], queryFn: () => listClientes() });
  const filtrados = (data ?? []).filter((c) => (c.cliente + " " + (c.telefono ?? "")).toLowerCase().includes(q.toLowerCase()));

  const exportar = () =>
    exportToExcel(
      filtrados.map((c) => ({
        Cliente: c.cliente,
        Teléfono: c.telefono ?? "",
        Pedidos: c.pedidos,
        Entregados: c.entregados,
        "Total comprado": c.total_comprado,
        "Último pedido": c.ultimo_pedido,
      })),
      "clientes-casa-diana",
      "Clientes",
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ink">Clientes</h1>
          <p className="text-sm text-muted">Se arma solo con los pedidos (por teléfono o nombre). “Total comprado” cuenta solo pedidos entregados.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={exportar}>
          Exportar Excel
        </button>
      </div>
      <input className={fieldClass} placeholder="Buscar por nombre o teléfono…" value={q} onChange={(e) => setQ(e.target.value)} />
      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay clientes.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase text-muted">
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Pedidos</th>
                <th className="px-3 py-2">Total comprado</th>
                <th className="px-3 py-2">Último</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-navy">{c.cliente}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.telefono ? (
                      <a className="underline" href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                        {c.telefono}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-navy">{c.pedidos}</td>
                  <td className="px-3 py-2 font-semibold text-navy">₲ {money(c.total_comprado)}</td>
                  <td className="px-3 py-2 text-xs text-muted">{new Date(c.ultimo_pedido).toLocaleDateString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
