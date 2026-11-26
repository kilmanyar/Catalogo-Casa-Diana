import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { misPedidos, type MiPedido } from "@/lib/cuenta";
import { money } from "@/lib/catalog";
import { ETAPA_LABEL } from "@/lib/etapas";
import { btnPrimary, fieldClass } from "@/components/store/ui";

const ESTADO: Record<string, string> = { pendiente: "Pendiente", confirmado: "Confirmado", entregado: "Entregado", cancelado: "Cancelado" };

export function CuentaDialog({
  open,
  onClose,
  onRepeat,
}: {
  open: boolean;
  onClose: () => void;
  onRepeat: (items: MiPedido["items"]) => number;
}) {
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pedidos, setPedidos] = useState<MiPedido[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!open || !userId) return;
    setPedidos(null);
    misPedidos().then(setPedidos).catch(() => setPedidos([]));
  }, [open, userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: err } =
        mode === "in"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: name || email });
      if (err) setError(err.message ?? "No se pudo continuar.");
      else setPassword("");
    } catch {
      setError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg focus:outline-none sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="font-display text-xl text-ink">Mi cuenta</Dialog.Title>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-full text-navy" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Iniciar sesión y ver tus pedidos.</Dialog.Description>
          <div className="px-4 py-4">
            {isPending ? (
              <p className="text-sm text-muted">Cargando…</p>
            ) : !user ? (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <p className="text-sm text-navy">
                  Creá tu cuenta para ver tus pedidos anteriores y repetirlos con un toque. Comprar sin cuenta sigue siendo posible.
                </p>
                {mode === "up" ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-navy">Nombre</span>
                    <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </label>
                ) : null}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-navy">Email</span>
                  <input type="email" required className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-navy">Contraseña</span>
                  <input type="password" required minLength={8} className={fieldClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
                  {mode === "up" ? <span className="text-xs text-muted">Mínimo 8 caracteres.</span> : null}
                </label>
                {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}
                <button type="submit" disabled={busy} className={btnPrimary}>
                  {busy ? "Un momento…" : mode === "in" ? "Ingresar" : "Crear cuenta"}
                </button>
                <button type="button" className="text-center text-sm text-muted underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }}>
                  {mode === "in" ? "No tengo cuenta — crear una" : "Ya tengo cuenta — ingresar"}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-paper p-3 ring-1 ring-line">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{user.displayName ?? "Cliente"}</p>
                    <p className="truncate text-xs text-muted">{user.primaryEmail}</p>
                  </div>
                  <button type="button" className="text-sm font-semibold text-coral" onClick={() => void signOut("/")}>Salir</button>
                </div>
                {aviso ? <p className="text-sm font-medium text-cash">{aviso}</p> : null}
                <h3 className="font-display text-lg text-navy">Mis pedidos</h3>
                {pedidos === null ? (
                  <p className="text-sm text-muted">Cargando…</p>
                ) : pedidos.length === 0 ? (
                  <p className="text-sm text-muted">Todavía no tenés pedidos con esta cuenta. Los próximos que hagas sesión iniciada van a aparecer acá.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {pedidos.map((p) => (
                      <li key={p.id} className="rounded-lg bg-paper p-3 ring-1 ring-line">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-navy">Pedido #{p.id}</p>
                          <span className="text-xs font-semibold text-orange">{p.estado === "entregado" || p.estado === "cancelado" ? ESTADO[p.estado] : ETAPA_LABEL[p.etapa] ?? ESTADO[p.estado]}</span>
                        </div>
                        <p className="text-xs text-muted">{new Date(p.fecha).toLocaleDateString("es-PY")}</p>
                        <ul className="mt-2 text-sm text-navy">
                          {p.items.map((i, idx) => (
                            <li key={idx}>{i.qty} × {i.nombre}</li>
                          ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-navy">₲ {money(p.total)}</span>
                          <button
                            type="button"
                            className="rounded-md bg-navy/10 px-3 py-1.5 text-sm font-semibold text-navy"
                            onClick={() => {
                              const n = onRepeat(p.items);
                              setAviso(n > 0 ? `Agregamos ${n} producto${n === 1 ? "" : "s"} a tu pedido con los precios de hoy.` : "Esos productos ya no están disponibles.");
                            }}
                          >
                            Repetir pedido
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
