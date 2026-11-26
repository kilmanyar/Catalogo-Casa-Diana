import { createMiddleware } from "@tanstack/react-start";

/**
 * Cliente opcional: si hay sesión, deja `clienteId` en el contexto; si no, null.
 * No exige iniciar sesión (los pedidos anónimos siguen funcionando).
 */
export const optionalUserMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    let clienteId: string | null = null;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser((context as { bearerToken?: string }).bearerToken);
      clienteId = user?.id ?? null;
    } catch {
      clienteId = null;
    }
    return next({ context: { clienteId } });
  });

/** Cliente obligatorio: devuelve 401 si no hay sesión. */
export const clienteMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    const { requireUserId } = await import("@/lib/auth/verify.server");
    assertSameSiteRequest();
    const userId = await requireUserId((context as { bearerToken?: string }).bearerToken);
    return next({ context: { userId } });
  });
