import { createHash, randomBytes } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export function baseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL.replace(/\/$/, "");
  const req = getRequest();
  return req ? new URL(req.url).origin : "";
}

/** Crea un token de un solo uso (60 min) si existe una cuenta con ese email. Devuelve el enlace o null. */
export async function crearEnlace(emailRaw: string): Promise<string | null> {
  const email = emailRaw.trim().toLowerCase();
  const sql = await getSql();
  const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${email}`;
  if (users.length === 0) return null;
  const recientes = await sql<{ n: string }>`
    select count(*) as n from reset_tokens where email = ${email} and created_at > now() - interval '1 hour'
  `;
  if (Number(recientes[0]?.n ?? 0) >= 5) return null;
  const token = randomBytes(32).toString("hex");
  await sql`insert into reset_tokens (token_hash, email, expires_at) values (${hash(token)}, ${email}, now() + interval '60 minutes')`;
  return `${baseUrl()}/recuperar?token=${token}`;
}

export async function enviarCorreo(email: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || "Casa Diana <onboarding@resend.dev>",
        to: [email.trim()],
        subject: "Recuperá tu contraseña — Casa Diana",
        text: `Pediste cambiar tu contraseña de Casa Diana.\n\nEntrá a este enlace (vale 60 minutos):\n${link}\n\nSi no fuiste vos, ignorá este correo.`,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Cambia la contraseña con un token válido y cierra las sesiones abiertas de esa cuenta. */
export async function usarToken(token: string, password: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ email: string }>`
    delete from reset_tokens where token_hash = ${hash(token)} and expires_at > now() returning email
  `;
  if (rows.length === 0) return false;
  const users = await sql<{ id: string }>`select id from "user" where lower(email) = ${rows[0].email}`;
  if (users.length === 0) return false;
  const ctx = await auth.$context;
  const nuevo = await ctx.password.hash(password);
  await ctx.internalAdapter.updatePassword(users[0].id, nuevo);
  await sql`delete from "session" where "userId" = ${users[0].id}`;
  return true;
}
