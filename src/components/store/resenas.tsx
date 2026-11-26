import { useEffect, useState } from "react";
import { enviarResena, listResenas, miEstadoResena, type ResenaPublica } from "@/lib/resenas";
import { btnPrimary } from "@/components/store/ui";

function Estrellas({ n }: { n: number }) {
  return (
    <span aria-label={`${n} de 5 estrellas`} className="text-orange">
      {"★".repeat(Math.round(n))}
      <span className="text-line">{"★".repeat(5 - Math.round(n))}</span>
    </span>
  );
}

/** Opiniones del producto: lista aprobada + formulario para quien compró y recibió el producto. */
export function Resenas({ productId, onOpenAccount }: { productId: string; onOpenAccount: () => void }) {
  const [data, setData] = useState<{ lista: ResenaPublica[]; promedio: number; total: number } | null>(null);
  const [estado, setEstado] = useState<{ sesion: boolean; puede: boolean; previa: null | { estrellas: number; comentario: string; estado: string } } | null>(null);
  const [estrellas, setEstrellas] = useState(5);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setMsg(null);
    listResenas({ data: { productId } }).then(setData).catch(() => setData({ lista: [], promedio: 0, total: 0 }));
    miEstadoResena({ data: { productId } })
      .then((s) => {
        setEstado(s);
        if (s.previa) {
          setEstrellas(s.previa.estrellas);
          setTexto(s.previa.comentario);
        }
      })
      .catch(() => setEstado(null));
  }, [productId]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await enviarResena({ data: { productId, estrellas, comentario: texto } });
      setMsg("¡Gracias! Tu opinión se publica apenas la revisemos.");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "No se pudo enviar.");
    }
  };

  if (!data) return null;
  if (data.total === 0 && !(estado?.puede)) return null;

  return (
    <div className="px-4 pb-8">
      <h3 className="font-display text-xl text-navy">Opiniones</h3>
      {data.total > 0 ? (
        <p className="mt-1 text-sm text-muted">
          <Estrellas n={data.promedio} /> {data.promedio.toFixed(1)} · {data.total} {data.total === 1 ? "opinión" : "opiniones"}
        </p>
      ) : null}
      <ul className="mt-3 flex flex-col gap-3">
        {data.lista.map((r) => (
          <li key={r.id} className="rounded-lg bg-paper p-3 ring-1 ring-line">
            <p className="text-sm font-semibold text-navy">{r.nombre} <Estrellas n={r.estrellas} /></p>
            {r.comentario ? <p className="mt-1 text-sm text-navy">{r.comentario}</p> : null}
          </li>
        ))}
      </ul>
      {estado?.puede ? (
        <form onSubmit={enviar} className="mt-4 flex flex-col gap-2 rounded-lg bg-paper p-3 ring-1 ring-line">
          <p className="text-sm font-semibold text-navy">{estado.previa ? "Editá tu opinión" : "Contanos qué te pareció"}</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={estrellas === n} aria-label={`${n} estrellas`} className={"text-2xl " + (n <= estrellas ? "text-orange" : "text-line")} onClick={() => setEstrellas(n)}>★</button>
            ))}
          </div>
          <textarea className="min-h-20 rounded-md border border-line bg-paper p-2 text-sm text-navy" maxLength={600} placeholder="Tu comentario (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} />
          {msg ? <p className="text-sm font-medium text-cash">{msg}</p> : null}
          {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}
          <button className={btnPrimary}>Enviar opinión</button>
        </form>
      ) : estado && !estado.sesion ? (
        <button type="button" className="mt-3 text-sm font-semibold text-navy underline" onClick={onOpenAccount}>¿Compraste este producto? Ingresá para opinar</button>
      ) : null}
    </div>
  );
}
