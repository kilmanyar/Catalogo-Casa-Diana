import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarProducto, listProductosAdmin, restaurarProducto, subirImagenProducto, type ProductoPanel } from "@/lib/admin/productos";
import { CATEGORIES, PRODUCTS, brandOf, money, presentationOf, type Product } from "@/lib/catalog";
import { btnPrimary, fieldClass, selectClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/productos")({ component: AdminProductos });

/** Reduce la foto a 900 px y la convierte a JPEG para que pese poco. */
async function reducirImagen(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("No se pudo leer la imagen."));
      i.src = url;
    });
    const k = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Form = {
  id: string; esNuevo: boolean; oculto: boolean; nombre: string; categoria: string; marca: string; presentacion: string;
  precio: string; precioEfectivo: string; stock: string; notas: string; genero: string;
};

function formDe(p: Product | null, c: ProductoPanel | undefined, nuevoId?: string): Form {
  if (!p) {
    return { id: nuevoId ?? "", esNuevo: true, oculto: false, nombre: "", categoria: "cosmeticos", marca: "", presentacion: "", precio: "", precioEfectivo: "", stock: "", notas: "", genero: "" };
  }
  return {
    id: p.id,
    esNuevo: Boolean(c?.esNuevo),
    oculto: Boolean(c?.oculto),
    nombre: c?.nombre ?? p.name,
    categoria: c?.categoria ?? p.category,
    marca: c?.marca ?? brandOf(p),
    presentacion: c?.presentacion ?? presentationOf(p),
    precio: String(c?.precio ?? p.price),
    precioEfectivo: String(c?.precioEfectivo ?? p.priceCash),
    stock: c?.stock !== null && c?.stock !== undefined ? String(c.stock) : p.stock !== null ? String(p.stock) : "",
    notas: c?.notas ?? p.notas ?? "",
    genero: c?.genero ?? p.genero ?? "",
  };
}

const soloNum = (s: string) => {
  const n = Number(s.replace(/\D/g, ""));
  return s.trim() === "" ? null : n;
};

function AdminProductos() {
  const qc = useQueryClient();
  const { data: cambios } = useQuery({ queryKey: ["admin", "productos"], queryFn: () => listProductosAdmin() });
  const [q, setQ] = useState("");
  const [f, setF] = useState<Form | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const porId = useMemo(() => new Map((cambios ?? []).map((c) => [c.id, c])), [cambios]);
  const nuevos = useMemo(() => (cambios ?? []).filter((c) => c.esNuevo), [cambios]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = PRODUCTS.filter((p) => !p.id.endsWith("_d10")).map((p) => ({ id: p.id, nombre: porId.get(p.id)?.nombre ?? p.name, precio: porId.get(p.id)?.precio ?? p.price, p, oculto: porId.get(p.id)?.oculto ?? false }));
    const extra = nuevos.map((c) => ({ id: c.id, nombre: c.nombre ?? c.id, precio: c.precio ?? 0, p: null as Product | null, oculto: c.oculto }));
    return [...extra, ...base].filter((x) => !t || (x.nombre + " " + x.id).toLowerCase().includes(t)).slice(0, 40);
  }, [q, porId, nuevos]);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["admin", "productos"] });

  const guardar = useMutation({
    mutationFn: (x: Form) =>
      guardarProducto({
        data: {
          id: x.id,
          esNuevo: x.esNuevo,
          oculto: x.oculto,
          nombre: x.nombre.trim() || null,
          categoria: x.categoria || null,
          marca: x.marca.trim() || null,
          presentacion: x.presentacion.trim() || null,
          precio: soloNum(x.precio),
          precioEfectivo: soloNum(x.precioEfectivo),
          stock: soloNum(x.stock),
          notas: x.notas.trim() || null,
          genero: x.genero.trim() || null,
        },
      }),
    onSuccess: () => { setMsg("Guardado. Ya se ve en la tienda."); setErr(null); refrescar(); },
    onError: (e) => { setErr(e instanceof Error ? e.message : "No se pudo guardar."); setMsg(null); },
  });

  const restaurar = useMutation({
    mutationFn: (id: string) => restaurarProducto({ data: { id } }),
    onSuccess: () => { setF(null); setMsg("Listo: volvió al catálogo original."); refrescar(); },
  });

  const subir = async (file: File) => {
    if (!f) return;
    setErr(null); setMsg(null);
    try {
      const dataUrl = await reducirImagen(file);
      // Un producto nuevo tiene que existir antes de recibir su foto.
      if (f.esNuevo && !porId.has(f.id)) {
        await guardarProducto({ data: { id: f.id, esNuevo: true, oculto: f.oculto, nombre: f.nombre.trim() || f.id, categoria: f.categoria, marca: null, presentacion: null, precio: soloNum(f.precio) ?? 1, precioEfectivo: null, stock: null, notas: null, genero: null } });
      }
      await subirImagenProducto({ data: { id: f.id, dataUrl } });
      setMsg("Foto subida.");
      refrescar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir la foto.");
    }
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => (x ? { ...x, [k]: v } : x));
  const imagenActual = f ? porId.get(f.id)?.imagen ?? PRODUCTS.find((p) => p.id === f.id)?.image ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-ink">Productos</h1>
          <p className="text-sm text-muted">Cambiá precios, fotos, stock y textos, ocultá productos o agregá nuevos. Los cambios se ven en la tienda al instante.</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => { setF(formDe(null, undefined, "px" + Date.now().toString(36))); setMsg(null); setErr(null); }}>Nuevo producto</button>
      </div>
      <input className={fieldClass} placeholder="Buscar por nombre o código…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ul className="flex max-h-[70vh] flex-col gap-1 overflow-y-auto">
          {lista.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className={"flex w-full items-center justify-between gap-2 rounded-md bg-paper px-3 py-2 text-left text-sm ring-1 ring-line " + (f?.id === x.id ? "outline-2 outline-orange" : "")}
                onClick={() => { setF(formDe(x.p, porId.get(x.id))); setMsg(null); setErr(null); }}
              >
                <span className="min-w-0 truncate text-navy">{x.nombre}{x.oculto ? " · oculto" : ""}{porId.has(x.id) ? " ✎" : ""}</span>
                <span className="shrink-0 text-muted">₲ {money(x.precio)}</span>
              </button>
            </li>
          ))}
        </ul>

        {f ? (
          <div className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
            <p className="text-sm font-semibold text-navy">{f.esNuevo ? "Producto nuevo" : `Editar · ${f.id}`}</p>
            <div className="flex items-center gap-3">
              {imagenActual ? <img src={imagenActual} alt="" className="size-24 rounded-md object-cover ring-1 ring-line" /> : <div className="grid size-24 place-items-center rounded-md bg-bg text-xs text-muted ring-1 ring-line">Sin foto</div>}
              <label className="text-sm font-semibold text-navy underline">
                {imagenActual ? "Cambiar foto" : "Subir foto"}
                <input type="file" accept="image/*" className="sr-only" aria-label="Subir foto" onChange={(e) => { const file = e.target.files?.[0]; if (file) void subir(file); e.target.value = ""; }} />
              </label>
            </div>
            <input className={fieldClass} placeholder="Nombre" aria-label="Nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
            <select className={selectClass} aria-label="Categoría" value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className={fieldClass} placeholder="Marca" aria-label="Marca" value={f.marca} onChange={(e) => set("marca", e.target.value)} />
              <input className={fieldClass} placeholder="Presentación (ej: 100 mL)" aria-label="Presentación" value={f.presentacion} onChange={(e) => set("presentacion", e.target.value)} />
              <input className={fieldClass} inputMode="numeric" placeholder="Precio tarjeta ₲" aria-label="Precio tarjeta" value={f.precio} onChange={(e) => set("precio", e.target.value)} />
              <input className={fieldClass} inputMode="numeric" placeholder="Precio efectivo ₲" aria-label="Precio efectivo" value={f.precioEfectivo} onChange={(e) => set("precioEfectivo", e.target.value)} />
              <input className={fieldClass} inputMode="numeric" placeholder="Stock (catálogo)" aria-label="Stock" value={f.stock} onChange={(e) => set("stock", e.target.value)} />
              <input className={fieldClass} placeholder="Género" aria-label="Género" value={f.genero} onChange={(e) => set("genero", e.target.value)} />
            </div>
            <textarea className="min-h-20 rounded-md border border-line bg-paper p-2 text-sm text-navy" placeholder="Notas / descripción" aria-label="Notas" value={f.notas} onChange={(e) => set("notas", e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" checked={f.oculto} onChange={(e) => set("oculto", e.target.checked)} /> Ocultar de la tienda
            </label>
            {err ? <p role="alert" className="text-sm font-medium text-coral">{err}</p> : null}
            {msg ? <p className="text-sm font-medium text-cash">{msg}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={guardar.isPending} onClick={() => guardar.mutate(f)}>Guardar</button>
              {porId.has(f.id) ? (
                <button type="button" className="rounded-md bg-coral/15 px-4 text-sm font-semibold text-coral" onClick={() => restaurar.mutate(f.id)}>
                  {f.esNuevo ? "Eliminar producto" : "Volver al original"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
