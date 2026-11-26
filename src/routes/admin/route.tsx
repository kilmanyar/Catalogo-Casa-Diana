import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getAccess } from "@/lib/admin/usuarios";
import { getDashboardStats } from "@/lib/admin/stats";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const NAV = [
  { to: "/admin", label: "Resumen" },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/entregas", label: "Entregas" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/stock", label: "Stock" },
  { to: "/admin/locales", label: "Locales" },
  { to: "/admin/facturacion", label: "Facturación" },
  { to: "/admin/ofertas", label: "Ofertas" },
  { to: "/admin/cupones", label: "Cupones" },
  { to: "/admin/reportes", label: "Reportes" },
  { to: "/admin/resenas", label: "Reseñas" },
  { to: "/admin/contenido", label: "Contenido" },
  { to: "/admin/compras", label: "Compras" },
  { to: "/admin/gastos", label: "Gastos" },
  { to: "/admin/usuarios", label: "Usuarios" },
] as const;

function AdminLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const { user, isPending } = useCurrentUserState();

  if (isPending) return null; // evita el flash de "no autorizado" mientras carga la sesión
  if (!user) return <RedirectToSignIn />;

  return (
    <QueryClientProvider client={queryClient}>
      <AdminShell email={user.primaryEmail} />
    </QueryClientProvider>
  );
}

/** El permiso se verifica en el servidor (dueños en config.ts + staff en la tabla admin_users). */
function AdminShell({ email }: { email: string | null | undefined }) {
  const location = useLocation();
  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => getAccess(), retry: false });

  // Aviso de pedidos nuevos: revisa cada 30 s y lo muestra en la pestaña y en el menú.
  const pend = useQuery({
    queryKey: ["admin", "pendientes"],
    queryFn: async () => (await getDashboardStats()).pedidosPendientes,
    enabled: Boolean(access.data),
    refetchInterval: 30000,
  });
  const pendientes = pend.data ?? 0;
  useEffect(() => {
    document.title = pendientes > 0 ? `(${pendientes}) Pedidos nuevos · Casa Diana Admin` : "Casa Diana Admin";
  }, [pendientes]);

  if (access.isPending) return null;
  if (access.isError || !access.data) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4 text-center">
        <div>
          <h1 className="font-display text-xl text-ink">Sin acceso</h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Esta cuenta ({email ?? "sin email"}) no tiene permiso para entrar al panel de administración. Pedile al dueño que la agregue en Usuarios.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-10 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-display text-lg text-ink">Casa Diana · Admin</p>
          </div>
          <UserButton />
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-semibold " +
                  (active ? "bg-navy text-paper" : "text-navy hover:bg-bg")
                }
              >
                {item.label}
                {item.to === "/admin/pedidos" && pendientes > 0 ? (
                  <span className="ml-1.5 rounded-full bg-coral px-1.5 py-0.5 text-[11px] text-paper">{pendientes}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
