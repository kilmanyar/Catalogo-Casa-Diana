import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { borrarResena, listResenasAdmin, moderarResena } from "@/lib/resenas";
import { productById } from "@/lib/catalog";

export const Route = createFileRoute("/admin/resenas")({ component: AdminResenas });

function AdminResenas() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "resenas"], queryFn: () => listResenasAdmin() });
  const refrescar = () => qc.invalidateQueries({ queryKey: ["admin", "resenas"] });
  const moderar = useMutation({ mutationFn: (v: { id: number; estado: "aprobada" | "rechazada" | "pendiente" }) => moderarResena({ data: v }), onSuccess: refrescar });
  const borrar = useMutation({ mutationFn: (id: number) => borrarResena({ data: { id } }), onSuccess: refrescar });
  const pendientes = (data ?? []).filter((r) => r.estado === "pendiente").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Reseñas de clientes</h1>
        <p className="text-sm text-muted">
          Solo opinan clientes con sesión que recibieron el producto. Aparecen en la tienda cuando las aprobás.{pendientes ? ` Tenés ${pendientes} por revisar.` : ""}
        </p>
      </div>
      {isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
      {data && data.length === 0 ? <p className="text-sm text-muted">Todavía no hay reseñas.</p> : null}
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((r) => (
          <li key={r.id} className="rounded-lg bg-paper p-3 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-navy">{productById(r.product_id)?.name ?? r.product_id}</p>
              <span className="text-xs font-semibold text-orange">{r.estado}</span>
            </div>
            <p className="text-sm text-navy">{r.nombre} · {"★".repeat(r.estrellas)}{"☆".repeat(5 - r.estrellas)}</p>
            {r.comentario ? <p className="mt-1 text-sm text-navy">{r.comentario}</p> : null}
            <div className="mt-2 flex gap-2">
              {r.estado !== "aprobada" ? <button type="button" className="rounded-md bg-cash/15 px-3 py-1.5 text-sm font-semibold text-cash" onClick={() => moderar.mutate({ id: r.id, estado: "aprobada" })}>Aprobar</button> : null}
              {r.estado !== "rechazada" ? <button type="button" className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy" onClick={() => moderar.mutate({ id: r.id, estado: "rechazada" })}>Rechazar</button> : null}
              <button type="button" className="rounded-md bg-coral/15 px-3 py-1.5 text-sm font-semibold text-coral" onClick={() => borrar.mutate(r.id)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
