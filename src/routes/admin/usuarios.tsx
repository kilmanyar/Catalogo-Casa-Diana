import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAdminUser, getAccess, listAdminUsers, removeAdminUser } from "@/lib/admin/usuarios";
import { btnOrange, fieldClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/usuarios")({ component: AdminUsuarios });

function AdminUsuarios() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const { data: access } = useQuery({ queryKey: ["admin", "access"], queryFn: () => getAccess() });
  const { data: users, isLoading } = useQuery({ queryKey: ["admin", "usuarios"], queryFn: () => listAdminUsers() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "usuarios"] });
  const add = useMutation({
    mutationFn: () => addAdminUser({ data: { email } }),
    onSuccess: () => {
      setEmail("");
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: (e: string) => removeAdminUser({ data: { email: e } }), onSuccess: refresh });
  const isOwner = access?.isOwner ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Usuarios del panel</h1>
        <p className="text-sm text-muted">
          Quién puede entrar a /admin. El staff tiene que crear su cuenta en /login con el mismo email que agregues acá. Solo el dueño agrega o quita staff.
        </p>
      </div>

      {isOwner ? (
        <div className="rounded-lg bg-paper p-4 ring-1 ring-line">
          <p className="text-sm font-semibold text-navy">Agregar staff</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input className={fieldClass} type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="button" className={btnOrange} disabled={!email.includes("@") || add.isPending} onClick={() => add.mutate()}>
              Agregar
            </button>
          </div>
          {add.isError ? <p className="mt-2 text-sm text-coral">No se pudo agregar. Revisá el email.</p> : null}
        </div>
      ) : (
        <p className="rounded-lg bg-paper p-3 text-sm text-muted ring-1 ring-line">Solo el dueño puede agregar o quitar usuarios.</p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(users ?? []).map((u) => (
            <li key={u.email} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3 ring-1 ring-line">
              <div>
                <p className="font-semibold text-navy">{u.email}</p>
                <p className="text-xs text-muted">{u.rol === "dueño" ? "Dueño (fijo en config.ts)" : `Staff · agregado por ${u.created_by ?? "—"}`}</p>
              </div>
              {isOwner && u.rol === "staff" ? (
                <button type="button" className="text-sm font-semibold text-coral" onClick={() => remove.mutate(u.email)}>
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
