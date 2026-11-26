import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { restablecerClave, solicitarRecuperacion } from "@/lib/recuperar";
import { btnPrimary, fieldClass } from "@/components/store/ui";

export const Route = createFileRoute("/recuperar")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : undefined }),
  component: Recuperar,
  head: () => ({ meta: [{ title: "Recuperar contraseña — Casa Diana" }] }),
});

function Recuperar() {
  const { token } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const pedir = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await solicitarRecuperacion({ data: { email } });
      setMsg("Si existe una cuenta con ese email, te enviamos un enlace para cambiar la contraseña. Revisá también el correo no deseado. Si no llega, pedile a Casa Diana por WhatsApp que te genere uno.");
    } catch {
      setErr("Revisá el email e intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const cambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      await restablecerClave({ data: { token, password: pass } });
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "No se pudo cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 bg-bg px-4 py-8">
      <h1 className="font-display text-2xl text-ink">Recuperar contraseña</h1>
      {done ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-cash">Listo, cambiamos tu contraseña. Ya podés ingresar con la nueva.</p>
          <Link to="/" className={btnPrimary}>Ir a la tienda</Link>
        </div>
      ) : token ? (
        <form onSubmit={cambiar} className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-navy">Nueva contraseña</span>
            <input className={fieldClass} type="password" minLength={8} required autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <span className="text-xs text-muted">Mínimo 8 caracteres.</span>
          </label>
          {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}
          <button className={btnPrimary} disabled={busy}>{busy ? "Guardando…" : "Cambiar contraseña"}</button>
        </form>
      ) : (
        <form onSubmit={pedir} className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-navy">Tu email</span>
            <input className={fieldClass} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {msg ? <p className="text-sm text-navy">{msg}</p> : null}
          {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}
          <button className={btnPrimary} disabled={busy}>{busy ? "Enviando…" : "Enviar enlace"}</button>
        </form>
      )}
      <Link to="/" className="text-sm font-semibold text-navy underline">← Volver a la tienda</Link>
    </main>
  );
}
