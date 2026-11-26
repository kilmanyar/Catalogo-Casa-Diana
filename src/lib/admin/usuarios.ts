import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { requireAdminMiddleware, ForbiddenError } from "./require-admin";
import { ADMIN_EMAILS } from "./config";

export type AdminUserRow = { email: string; rol: "dueño" | "staff"; created_by: string | null; created_at: string | null };

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async (): Promise<AdminUserRow[]> => {
    const sql = await getSql();
    const staff = await sql<{ email: string; created_by: string; created_at: string }>`
      select email, created_by, created_at from admin_users order by created_at
    `;
    const owners: AdminUserRow[] = ADMIN_EMAILS.map((email) => ({
      email: email.toLowerCase(),
      rol: "dueño",
      created_by: null,
      created_at: null,
    }));
    return [...owners, ...staff.map((s) => ({ ...s, rol: "staff" as const }))];
  });

const emailInput = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

export const addAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => emailInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.isOwner) throw new ForbiddenError();
    const sql = await getSql();
    await sql`insert into admin_users (email, created_by) values (${data.email}, ${context.adminEmail})
              on conflict (email) do nothing`;
    return { ok: true };
  });

export const removeAdminUser = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator((input: unknown) => emailInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!context.isOwner) throw new ForbiddenError();
    const sql = await getSql();
    await sql`delete from admin_users where lower(email) = ${data.email}`;
    return { ok: true };
  });

/** Quién soy y si soy dueño: lo usa el layout del panel para decidir si muestra o no el acceso. */
export const getAccess = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async ({ context }) => ({ email: context.adminEmail, isOwner: context.isOwner }));
