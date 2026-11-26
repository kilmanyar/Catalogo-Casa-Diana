/**
 * Who gets into the admin panel (/admin). Having a Better Auth account is NOT
 * enough — the email must be listed here too. Anyone can in principle sign up
 * at /login (email/password), but only these emails pass `requireAdmin`
 * (`src/lib/admin/require-admin.ts`) on the server, and the UI gate in
 * `src/routes/admin/route.tsx` mirrors it so a non-admin never sees the panel.
 *
 * Edit this list to add/remove store staff. Case-insensitive.
 */
export const ADMIN_EMAILS = ["kilmanyar@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === normalized);
}
