import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardStats } from "@/lib/admin/stats";
import { getRespaldo } from "@/lib/admin/respaldo";
import { exportSheetsToExcel } from "@/lib/admin/xlsx-export";
import { productById } from "@/lib/catalog";
import { btnPrimary } from "@/components/store/ui";
import { money } from "@/lib/catalog";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "cash" | "coral" | "navy" }) {
  return (
    <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={
          "mt-1 font-display text-2xl " +
          (accent === "cash" ? "text-cash" : accent === "coral" ? "text-coral" : "text-navy")
        }
      >
        {value}
      </p>
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => getDashboardStats(),
  });

  if (isLoading) return <p className="text-sm text-muted">Cargando…</p>;
  if (error || !data) return <p className="text-sm text-coral">No se pudo cargar el resumen.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Ventas hoy" value={`₲ ${money(data.ventasHoy)}`} accent="cash" />
        <Kpi label="Ventas del mes" value={`₲ ${money(data.ventasMes)}`} accent="cash" />
        <Kpi label="Pedidos pendientes" value={String(data.pedidosPendientes)} accent="coral" />
        <Kpi label="Entregas por hacer" value={String(data.entregasPendientes)} />
        <Kpi label="Compras del mes" value={`₲ ${money(data.comprasMes)}`} />
        <Kpi label="Gastos del mes" value={`₲ ${money(data.gastosMes)}`} />
        <Kpi
          label="Margen del mes"
          value={`₲ ${money(data.margenMes)}`}
          accent={data.margenMes >= 0 ? "cash" : "coral"}
        />
      </div>

      {data.stockBajo.length > 0 ? (
        <div className="rounded-lg bg-coral/10 p-4 ring-1 ring-coral/30">
          <h2 className="font-display text-lg text-coral">Stock bajo ({data.stockBajo.length})</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-navy">
            {data.stockBajo.map((s) => (
              <li key={s.product_id} className="flex justify-between gap-2">
                <span className="truncate">{productById(s.product_id)?.name ?? s.product_id}</span>
                <span className="font-semibold">
                  {s.qty} / mín. {s.stock_minimo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <h2 className="font-display text-lg text-ink">Ventas vs. costo — últimos 30 días</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.ventasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4dcd0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `₲ ${money(v)}`} />
              <Line type="monotone" dataKey="ventas" stroke="#2f6b45" strokeWidth={2} dot={false} name="Ventas" />
              <Line type="monotone" dataKey="costo" stroke="#c0392b" strokeWidth={2} dot={false} name="Costo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-muted">Solo pedidos marcados como "entregado". El costo usa el último precio de compra cargado para cada producto.</p>
      </div>

      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <h2 className="font-display text-lg text-ink">Top 10 productos — últimos 30 días</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.topProductos} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4dcd0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="product_name"
                width={160}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v: number) => `₲ ${money(v)}`} />
              <Bar dataKey="ventas" fill="#ee6b3d" name="Ventas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
        <h2 className="font-display text-lg text-ink">Respaldo</h2>
        <p className="mt-1 text-sm text-muted">Baja un Excel con todos los pedidos, items, stock, compras y gastos. Conviene hacerlo una vez por semana.</p>
        <button
          type="button"
          className={btnPrimary + " mt-3"}
          onClick={async () => {
            const r = await getRespaldo();
            exportSheetsToExcel(
              { Pedidos: r.pedidos, Items: r.items, Stock: r.stock, Compras: r.compras, Gastos: r.gastos },
              `respaldo-casa-diana-${new Date().toISOString().slice(0, 10)}`,
            );
          }}
        >
          Descargar respaldo completo
        </button>
      </div>
    </div>
  );
}
