/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off by default. To enable: set `emailAndPasswordEnabled` to `true` below,
 * then build sign-up / sign-in forms with `authClient.signUp.email` /
 * `authClient.signIn.email` from `@/lib/auth/client` (see the auth skill).
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 *
 * Enabled for Casa Diana's admin panel (/admin): the store owner signs in
 * with email + password. Access to the panel itself is additionally gated by
 * an email allowlist (see `src/lib/admin/config.ts`) — creating an account
 * here does not by itself grant admin access.
 */
export const emailAndPasswordEnabled = true;
