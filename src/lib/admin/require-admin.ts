import { createMiddleware } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { isAdminEmail } from "./config";

/**
 * Server-only. Thrown when the caller is signed in but their email is not in
 * the admin allowlist (`src/lib/admin/config.ts`). Distinct from the 401
 * `UnauthorizedError` thrown by `authMiddleware` for a signed-out caller.
 */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("No tenés acceso al panel de administración.");
    this.name = "ForbiddenError";
  }
}

/**
 * Admin-only server function middleware: verifies the caller is signed in
 * (via the prewired `authMiddleware`'s flow) AND that their account email is
 * in `ADMIN_EMAILS`. Use on every server function under the admin panel
 * (pedidos, stock, compras, gastos, estadísticas) — never trust the client-side
 * `requireAdmin()` route guard alone, since a server function can be called
 * directly.
 *
 *   import { requireAdminMiddleware } from "@/lib/admin/require-admin";
 *
 *   export const listPedidos = createServerFn({ method: "GET" })
 *     .middleware([requireAdminMiddleware])
 *     .handler(async () => { ... });
 */
export const requireAdminMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { requireUserId, getSessionUser } = await import("@/lib/auth/verify.server");
    assertSameSiteRequest();
    const userId = await requireUserId(
      (context as { bearerToken?: string }).bearerToken,
    );
    const user = await getSessionUser(
      (context as { bearerToken?: string }).bearerToken,
    );
    const email = user?.email?.toLowerCase();
    const isOwner = isAdminEmail(email);
    let allowed = isOwner;
    if (!allowed && email) {
      // Staff agregado desde /admin/usuarios (tabla admin_users).
      const sql = await getSql();
      const rows = await sql<{ email: string }>`select email from admin_users where lower(email) = ${email}`;
      allowed = rows.length > 0;
    }
    if (!allowed) {
      throw new ForbiddenError();
    }
    return next({ context: { userId, adminEmail: email as string, isOwner } });
  });

/** Ensure there's a `stock` row for a product before adjusting it. */
export async function ensureStockRow(productId: string): Promise<void> {
  const sql = await getSql();
  await sql`insert into stock (product_id, qty) values (${productId}, 0)
            on conflict (product_id) do nothing`;
}
