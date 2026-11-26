import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireAdminMiddleware, ForbiddenError } from "@/lib/admin/require-admin";

/** Público: pide un enlace por correo. Responde siempre igual, exista o no la cuenta. */
export const solicitarRecuperacion = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { crearEnlace, enviarCorreo } = await import("./recuperar.server");
      const link = await crearEnlace(data.email);
      if (link) await enviarCorreo(data.email, link);
    } catch {
      /* respuesta genérica */
    }
    return { ok: true };
  });

export const restablecerClave = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ token: z.string().min(20).max(200), password: z.string().min(8).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { usarToken } = await import("./recuperar.server");
    const ok = await usarToken(data.token, data.password);
    if (!ok) throw new Error("El enlace no es válido o ya venció. Pedí uno nuevo.");
    return { ok: true };
  });

/** Solo dueño: genera un enlace para mandar por WhatsApp (sirve aunque no haya correo configurado). */
export const generarEnlaceRecuperacion = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!context.isOwner) throw new ForbiddenError();
    const { crearEnlace } = await import("./recuperar.server");
    const link = await crearEnlace(data.email);
    if (!link) throw new Error("No existe una cuenta con ese email (o se pidieron demasiados enlaces).");
    return { link };
  });
