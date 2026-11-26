import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { borrarCupon, guardarCupon, listCupones } from "@/lib/admin/cupones";
import { money } from "@/lib/catalog";
import { btnPrimary, fieldClass, selectClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/cupones")({ component: AdminCupones });

function AdminCupones() {
  const qc = useQueryClient();
  const { data: cupones } = useQuery({ queryKey: ["admin", "cupones"], queryFn: () => listCupones() });
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [valor, setValor] = useState("");
  const [maxUsos, setMaxUsos] = useState("");
  const [vence, setVence] = useState("");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: (v: { codigo: string; tipo: "porcentaje" | "monto"; valor: number; activo: boolean; maxUsos: number | null; vence: string | null }) => guardarCupon({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cupones"] }),
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo guardar."),
  });
  const borrar = useMutation({
    mutationFn: (c: string) => borrarCupon({ data: { codigo: c } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "cupones"] }),
  });

  const crear = () => {
    setError(null);
    const v = Number(valor.replace(/[^\d.]/g, ""));
    if (codigo.trim().length < 2 || !v) return setError("Completá código y valor.");
    guardar.mutate({
      codigo,
      tipo,
      valor: v,
      activo: true,
      maxUsos: maxUsos.trim() ? Number(maxUsos) : null,
      vence: vence || null,
    });
    setCodigo(""); setValor(""); setMaxUsos(""); setVence("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Cupones de descuento</h1>
        <p className="text-sm text-muted">El cliente escribe el código en el carrito. Podés limitar los usos y la fecha de vencimiento.</p>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg bg-paper p-4 ring-1 ring-line">
        <input className={fieldClass + " max-w-40"} placeholder="CÓDIGO" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
        <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value as "porcentaje" | "monto")}>
          <option value="porcentaje">% de descuento</option>
          <option value="monto">Monto fijo ₲</option>
        </select>
        <input className={fieldClass + " max-w-32"} inputMode="decimal" placeholder={tipo === "porcentaje" ? "10" : "50000"} value={valor} onChange={(e) => setValor(e.target.value)} />
        <input className={fieldClass + " max-w-32"} inputMode="numeric" placeholder="Usos máx." value={maxUsos} onChange={(e) => setMaxUsos(e.target.value)} />
        <input className={fieldClass + " max-w-44"} type="date" value={vence} onChange={(e) => setVence(e.target.value)} aria-label="Vence" />
        <button type="button" className={btnPrimary} onClick={crear}>Crear cupón</button>
        {error ? <p className="w-full text-sm font-medium text-coral">{error}</p> : null}
      </div>
      <ul className="flex flex-col gap-2">
        {(cupones ?? []).length === 0 ? <li className="text-sm text-muted">Todavía no hay cupones.</li> : null}
        {(cupones ?? []).map((c) => (
          <li key={c.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper p-3 ring-1 ring-line">
            <div>
              <p className="text-sm font-semibold text-navy">{c.codigo} {c.activo ? "" : "· pausado"}</p>
              <p className="text-xs text-muted">
                {c.tipo === "porcentaje" ? `${Number(c.valor)}%` : `₲ ${money(Number(c.valor))}`} · usos {c.usos}{c.max_usos ? `/${c.max_usos}` : ""}{c.vence ? ` · vence ${c.vence.slice(0, 10)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy"
                onClick={() => guardar.mutate({ codigo: c.codigo, tipo: c.tipo as "porcentaje" | "monto", valor: Number(c.valor), activo: !c.activo, maxUsos: c.max_usos, vence: c.vence ? c.vence.slice(0, 10) : null })}>
                {c.activo ? "Pausar" : "Activar"}
              </button>
              <button type="button" className="rounded-md bg-coral/15 px-3 py-1.5 text-sm font-semibold text-coral" onClick={() => borrar.mutate(c.codigo)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
