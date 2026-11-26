import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eliminarGasto, listGastos, registrarGasto } from "@/lib/admin/gastos";
import { money } from "@/lib/catalog";
import { btnOrange, fieldClass } from "@/components/store/ui";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/gastos")({ component: AdminGastos });

const CATEGORIAS = ["Alquiler", "Flete / envíos", "Servicios", "Sueldos", "Marketing", "Insumos", "Otro"];

function AdminGastos() {
  const qc = useQueryClient();
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState(0);

  const { data: gastos, isLoading } = useQuery({ queryKey: ["admin", "gastos"], queryFn: () => listGastos() });

  const registrar = useMutation({
    mutationFn: () => registrarGasto({ data: { categoria, descripcion: descripcion || undefined, monto } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "gastos"] });
      setDescripcion("");
      setMonto(0);
    },
  });

  const borrar = useMutation({
    mutationFn: (id: number) => eliminarGasto({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "gastos"] }),
  });

  const exportar = () => {
    if (!gastos) return;
    exportToExcel(
      gastos.map((g) => ({
        Categoría: g.categoria,
        Descripción: g.descripcion ?? "",
        Monto: Number(g.monto),
        "Cargado por": g.created_by ?? "",
        Fecha: g.created_at,
      })),
      "gastos-casa-diana",
      "Gastos",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl text-ink">Gastos</h1>
        <button type="button" className="h-11 rounded-md bg-navy px-4 text-sm font-semibold text-paper" onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <p className="text-sm font-semibold text-navy">Registrar gasto</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select className={fieldClass + " sm:w-48"} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input className={fieldClass + " flex-1"} placeholder="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <input
            type="number"
            min={0}
            className={fieldClass + " sm:w-36"}
            placeholder="Monto (₲)"
            value={monto || ""}
            onChange={(e) => setMonto(Number(e.target.value) || 0)}
          />
          <button type="button" disabled={monto <= 0 || registrar.isPending} className={btnOrange} onClick={() => registrar.mutate()}>
            Agregar
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : !gastos || gastos.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay gastos registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-paper ring-1 ring-line">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold uppercase text-muted">
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 text-navy">{g.categoria}</td>
                  <td className="px-3 py-2 text-muted">{g.descripcion || "—"}</td>
                  <td className="px-3 py-2 text-navy">₲ {money(Number(g.monto))}</td>
                  <td className="px-3 py-2 text-xs text-muted">{new Date(g.created_at).toLocaleString("es-PY")}</td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-xs text-coral" onClick={() => borrar.mutate(g.id)}>
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
