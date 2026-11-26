import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getReportes } from "@/lib/admin/reportes";
import { categoryLabel, money } from "@/lib/catalog";
import { btnPrimary } from "@/components/store/ui";
import { exportSheetsToExcel } from "@/lib/admin/xlsx-export";

export const Route = createFileRoute("/admin/reportes")({ component: AdminReportes });

function Panel({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-paper p-4 ring-1 ring-line">
      <h2 className="font-display text-lg text-navy">{titulo}</h2>
      {nota ? <p className="text-xs text-muted">{nota}</p> : null}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </section>
  );
}

const th = "px-2 py-1.5 text-left text-xs font-semibold text-muted";
const td = "px-2 py-1.5 text-sm text-navy";

function AdminReportes() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "reportes"], queryFn: () => getReportes() });

  const exportar = () => {
    if (!data) return;
    exportSheetsToExcel(
      {
        "Más vendidos": data.topProductos,
        "Por categoría": data.porCategoria,
        "Clientes inactivos": data.clientesInactivos,
        "Reposición": data.reposicion,
      },
      "reportes-casa-diana",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ink">Reportes</h1>
          <p className="text-sm text-muted">Se calculan con los pedidos marcados como entregados.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={exportar} disabled={!data}>Exportar Excel</button>
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <>
          <Panel titulo="Productos más vendidos">
            {data.topProductos.length === 0 ? <p className="text-sm text-muted">Todavía no hay ventas entregadas.</p> : (
              <table className="w-full"><thead><tr><th className={th}>Producto</th><th className={th}>Unidades</th><th className={th}>Ventas</th></tr></thead>
                <tbody>{data.topProductos.map((p) => (<tr key={p.product_name}><td className={td}>{p.product_name}</td><td className={td}>{p.unidades}</td><td className={td}>₲ {money(p.ventas)}</td></tr>))}</tbody></table>
            )}
          </Panel>
          {data.porLocal.length > 1 ? (
            <Panel titulo="Ventas por local">
              <table className="w-full"><thead><tr><th className={th}>Local</th><th className={th}>Pedidos</th><th className={th}>Ventas</th></tr></thead>
                <tbody>{data.porLocal.map((l) => (<tr key={l.local}><td className={td}>{l.local}</td><td className={td}>{l.pedidos}</td><td className={td}>₲ {money(l.ventas)}</td></tr>))}</tbody></table>
            </Panel>
          ) : null}
          <Panel titulo="Margen por categoría" nota="Margen = ventas − costo de la última compra registrada.">
            {data.porCategoria.length === 0 ? <p className="text-sm text-muted">Sin datos todavía.</p> : (
              <table className="w-full"><thead><tr><th className={th}>Categoría</th><th className={th}>Unid.</th><th className={th}>Ventas</th><th className={th}>Costo</th><th className={th}>Margen</th></tr></thead>
                <tbody>{data.porCategoria.map((c) => (<tr key={c.categoria}><td className={td}>{categoryLabel(c.categoria)}</td><td className={td}>{c.unidades}</td><td className={td}>₲ {money(c.ventas)}</td><td className={td}>₲ {money(c.costo)}</td><td className={td + " font-semibold"}>₲ {money(c.margen)}</td></tr>))}</tbody></table>
            )}
          </Panel>
          <Panel titulo="Clientes que dejaron de comprar" nota="Sin compras entregadas en los últimos 60 días. Ideal para escribirles por WhatsApp.">
            {data.clientesInactivos.length === 0 ? <p className="text-sm text-muted">Ninguno por ahora.</p> : (
              <table className="w-full"><thead><tr><th className={th}>Cliente</th><th className={th}>Teléfono</th><th className={th}>Días sin comprar</th><th className={th}>Total comprado</th></tr></thead>
                <tbody>{data.clientesInactivos.map((c) => (<tr key={c.cliente + c.telefono}><td className={td}>{c.cliente}</td><td className={td}>{c.telefono ? <a className="underline" target="_blank" rel="noreferrer" href={`https://wa.me/${c.telefono.replace(/\D/g, "")}`}>{c.telefono}</a> : "—"}</td><td className={td}>{c.dias}</td><td className={td}>₲ {money(c.total)}</td></tr>))}</tbody></table>
            )}
          </Panel>
          <Panel titulo="Sugerencia de reposición" nota="Productos en o bajo su stock mínimo. Cargá el mínimo en Stock.">
            {data.reposicion.length === 0 ? <p className="text-sm text-muted">Nada para reponer.</p> : (
              <table className="w-full"><thead><tr><th className={th}>Producto</th><th className={th}>Stock</th><th className={th}>Mínimo</th><th className={th}>Vendidos (30 d)</th><th className={th}>Comprar</th></tr></thead>
                <tbody>{data.reposicion.map((r) => (<tr key={r.product_id}><td className={td}>{r.nombre}</td><td className={td + " text-coral font-semibold"}>{r.qty}</td><td className={td}>{r.minimo}</td><td className={td}>{r.vendidos30}</td><td className={td + " font-semibold"}>{r.sugerido}</td></tr>))}</tbody></table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
