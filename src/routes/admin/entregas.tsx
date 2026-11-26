import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { actualizarEstadoPedido, listEntregas } from "@/lib/admin/pedidos";
import { money } from "@/lib/catalog";
import { btnPrimary } from "@/components/store/ui";
import { exportToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/entregas")({ component: AdminEntregas });

function AdminEntregas() {
  const qc = useQueryClient();
  const { data: pedidos, isLoading } = useQuery({ queryKey: ["admin", "entregas"], queryFn: () => listEntregas() });
  const cambiar = useMutation({
    mutationFn: (vars: { id: number; estado: "confirmado" | "entregado" | "cancelado" }) => actualizarEstadoPedido({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  const hoy = new Date().toISOString().slice(0, 10);

  const exportar = () => {
    if (!pedidos) return;
    exportToExcel(
      pedidos.map((p) => ({
        Pedido: p.id,
        Cliente: p.cliente_nombre ?? "",
        Teléfono: p.cliente_telefono ?? "",
        Entrega: p.entrega_tipo === "delivery" ? "Delivery" : "Retiro en Lambaré",
        Dirección: p.direccion ?? "",
        "Fecha de entrega": p.fecha_entrega ?? "",
        Total: Number(p.total),
        Envío: Number(p.costo_envio),
        Pagado: p.pagado ? "Sí" : "No",
      })),
      "entregas-pendientes",
      "Entregas",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ink">Entregas pendientes</h1>
          <p className="text-sm text-muted">Pedidos pendientes o confirmados, los más urgentes primero. Cargá fecha y dirección desde Pedidos → Ver.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={exportar}>
          Exportar Excel
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : !pedidos || pedidos.length === 0 ? (
        <p className="text-sm text-muted">No hay entregas pendientes. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pedidos.map((p) => {
            const atrasado = p.fecha_entrega && p.fecha_entrega.slice(0, 10) < hoy;
            return (
              <li key={p.id} className="rounded-lg bg-paper p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy">
                      #{p.id} · {p.cliente_nombre || "Sin nombre"} {p.cliente_telefono ? `· ${p.cliente_telefono}` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      {p.entrega_tipo === "delivery" ? `Delivery: ${p.direccion || "sin dirección cargada"}` : "Retiro en Lambaré"}
                    </p>
                    <p className={"text-sm " + (atrasado ? "font-semibold text-coral" : "text-muted")}>
                      {p.fecha_entrega ? `Entrega: ${p.fecha_entrega.slice(0, 10)}${atrasado ? " (atrasado)" : ""}` : "Sin fecha de entrega"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-navy">₲ {money(Number(p.total) + Number(p.costo_envio))}</p>
                    <p className={"text-xs font-semibold " + (p.pagado ? "text-cash" : "text-coral")}>{p.pagado ? "Pagado" : "Sin pagar"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.estado === "pendiente" ? (
                    <button type="button" className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy" onClick={() => cambiar.mutate({ id: p.id, estado: "confirmado" })}>
                      Confirmar
                    </button>
                  ) : null}
                  <button type="button" className="rounded-md bg-cash/15 px-3 py-1.5 text-sm font-semibold text-cash" onClick={() => cambiar.mutate({ id: p.id, estado: "entregado" })}>
                    Marcar entregado
                  </button>
                  <button type="button" className="rounded-md bg-coral/15 px-3 py-1.5 text-sm font-semibold text-coral" onClick={() => cambiar.mutate({ id: p.id, estado: "cancelado" })}>
                    Cancelar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
