import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth/client";
import { btnPrimary, fieldClass } from "@/components/store/ui";

export const Route = createFileRoute("/login")({ component: Login });

/**
 * Admin sign-in — email/password only (no Google/X buttons): this is the
 * entry point to /admin, not a customer-facing feature, so it deliberately
 * doesn't invite public sign-ups via social providers. Anyone can still
 * create an account here (Better Auth requires a sign-up step), but actually
 * reaching the panel also requires the email to be in the allowlist
 * (`src/lib/admin/config.ts`) — see `src/routes/admin/route.tsx`.
 */
function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: err } =
        mode === "in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email });
      if (err) {
        setError(err.message ?? "No se pudo iniciar sesión.");
        return;
      }
      void navigate({ to: "/admin" });
    } catch {
      setError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-paper p-6 ring-1 ring-line">
        <h1 className="font-display text-xl text-ink">Panel de administración</h1>
        <p className="mt-1 text-sm text-muted">Casa Diana — acceso interno</p>

        <div className="mt-5 flex flex-col gap-3">
          {mode === "up" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-navy">Nombre</span>
              <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-navy">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className={fieldClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-navy">Contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              className={fieldClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm font-medium text-coral">{error}</p> : null}

        <button type="submit" disabled={busy} className={btnPrimary + " mt-5 w-full"}>
          {busy ? "Un momento…" : mode === "in" ? "Ingresar" : "Crear cuenta"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-3 w-full text-center text-xs text-muted underline-offset-4 hover:underline"
        >
          {mode === "in" ? "Primera vez — crear cuenta" : "Ya tengo cuenta — iniciar sesión"}
        </button>
      </form>
    </main>
  );
}
