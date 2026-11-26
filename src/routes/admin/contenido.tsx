import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listOfertasPublicas } from "@/lib/admin/ofertas";
import { listProductosPanel } from "@/lib/admin/productos";
import { BROWSE_PRODUCTS, STORE, aplicarCambiosPanel, brandOf, cashUnit, conOferta, money, orderLineName, type OfertaPublica, type Product } from "@/lib/catalog";
import { btnPrimary, fieldClass, selectClass } from "@/components/store/ui";

export const Route = createFileRoute("/admin/contenido")({ component: AdminContenido });

const FORMATOS = {
  post: { label: "Publicación (cuadrada)", w: 1080, h: 1080 },
  story: { label: "Historia / Estado (vertical)", w: 1080, h: 1920 },
} as const;

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function envolver(ctx: CanvasRenderingContext2D, texto: string, maxW: number): string[] {
  const out: string[] = [];
  let linea = "";
  for (const palabra of texto.split(" ")) {
    const prueba = linea ? linea + " " + palabra : palabra;
    if (ctx.measureText(prueba).width > maxW && linea) {
      out.push(linea);
      linea = palabra;
    } else linea = prueba;
  }
  if (linea) out.push(linea);
  return out;
}

async function dibujar(canvas: HTMLCanvasElement, p: Product, formato: keyof typeof FORMATOS, titular: string) {
  const { w, h } = FORMATOS[formato];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#FBE9EC");
  g.addColorStop(1, "#F6CBD2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const margen = 60;
  ctx.fillStyle = "#1F2A44";
  ctx.font = "700 54px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(STORE.name, margen, 110);

  if (titular) {
    ctx.font = "800 44px system-ui, sans-serif";
    const tw = ctx.measureText(titular.toUpperCase()).width + 56;
    ctx.fillStyle = "#E23A4A";
    ctx.beginPath();
    ctx.roundRect(w - margen - tw, 62, tw, 64, 32);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(titular.toUpperCase(), w - margen - tw / 2, 108);
    ctx.textAlign = "left";
  }

  const cardTop = 160;
  const cardH = formato === "post" ? 420 : 980;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(margen, cardTop, w - margen * 2, cardH, 36);
  ctx.fill();
  const img = p.image ? await cargarImagen(p.image) : null;
  if (img) {
    const maxW = w - margen * 2 - 60;
    const maxH = cardH - 60;
    const k = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * k;
    const ih = img.height * k;
    ctx.drawImage(img, (w - iw) / 2, cardTop + (cardH - ih) / 2, iw, ih);
  }

  let y = cardTop + cardH + 80;
  ctx.fillStyle = "#1F2A44";
  ctx.font = "700 52px system-ui, sans-serif";
  const lineas = envolver(ctx, p.name, w - margen * 2).slice(0, 2);
  for (const l of lineas) {
    ctx.fillText(l, margen, y);
    y += 62;
  }
  const marca = brandOf(p);
  if (marca) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 34px system-ui, sans-serif";
    ctx.fillText(marca, margen, y - 6);
    y += 44;
  }
  y += 16;
  ctx.fillStyle = "#1F7A4D";
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.fillText(`₲ ${money(cashUnit(p))}`, margen, y);
  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillStyle = "#1F7A4D";
  ctx.fillText("efectivo / transferencia", margen, y + 42);
  ctx.fillStyle = "#1F2A44";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`₲ ${money(p.price)} tarjeta`, w - margen, y);
  if (p.precioAntes) {
    ctx.fillStyle = "#6B7280";
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.fillText(`antes ₲ ${money(p.precioAntes)}`, w - margen, y + 42);
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "#25D366";
  ctx.beginPath();
  ctx.roundRect(margen, h - 130, w - margen * 2, 84, 42);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText(`Pedí por WhatsApp · +${STORE.whatsapp}`, w / 2, h - 77);
}

function AdminContenido() {
  const [q, setQ] = useState("");
  const [elegido, setElegido] = useState<Product | null>(null);
  const [formato, setFormato] = useState<keyof typeof FORMATOS>("post");
  const [titular, setTitular] = useState("");
  const [ofertas, setOfertas] = useState<Record<string, OfertaPublica>>({});
  const [copiado, setCopiado] = useState(false);
  const [ver, setVer] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Usa los precios y fotos vigentes de la tienda (incluye cambios hechos en Productos).
    listProductosPanel().then((rows) => { if (rows.length) { aplicarCambiosPanel(rows); setVer((v) => v + 1); } }).catch(() => {});
    listOfertasPublicas()
      .then((rows) => setOfertas(Object.fromEntries(rows.map((r) => [r.productId, r]))))
      .catch(() => {});
  }, []);

  const sugerencias = useMemo(
    () => (q.trim().length >= 2 ? BROWSE_PRODUCTS.filter((p) => (p.name + " " + p.id).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, ver],
  );
  const producto = elegido ? conOferta(elegido, ofertas) : null;
  const titularFinal = titular || (producto?.etiqueta ? { oferta: "Oferta", nuevo: "Nuevo", mas_vendido: "Más vendido" }[producto.etiqueta] : "") || "";

  useEffect(() => {
    if (producto && canvasRef.current) void dibujar(canvasRef.current, producto, formato, titularFinal);
  }, [producto, formato, titularFinal]);

  const texto = producto
    ? [
        `✨ ${producto.name}${titularFinal ? ` — ${titularFinal.toUpperCase()}` : ""}`,
        "",
        `💵 Efectivo/transferencia: ₲ ${money(cashUnit(producto))}`,
        `💳 Tarjeta: ₲ ${money(producto.price)}${producto.precioAntes ? ` (antes ₲ ${money(producto.precioAntes)})` : ""}`,
        "",
        `📍 Retiro en Lambaré · Compras online 24/7`,
        `📲 Pedí por WhatsApp: https://wa.me/${STORE.whatsapp}`,
        "",
        `#${STORE.name.replace(/\s+/g, "")} #Paraguay #${producto.category}`,
      ].join("\n")
    : "";

  const descargar = () => {
    const c = canvasRef.current;
    if (!c || !producto) return;
    const a = document.createElement("a");
    a.download = `${producto.id}-${formato}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl text-ink">Contenido para redes</h1>
        <p className="text-sm text-muted">Elegí un producto y descargá la imagen lista para Instagram o para el estado de WhatsApp, con su texto. Si tiene oferta activa, sale con el precio rebajado.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-lg bg-paper p-4 ring-1 ring-line">
        <input className={fieldClass} placeholder="Buscar producto por nombre o código…" value={q} onChange={(e) => { setQ(e.target.value); setElegido(null); }} />
        {sugerencias.length > 0 && !elegido ? (
          <ul className="max-h-48 overflow-y-auto rounded-md ring-1 ring-line">
            {sugerencias.map((p) => (
              <li key={p.id}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-bg" onClick={() => { setElegido(p); setQ(p.name); }}>
                  {p.name} <span className="text-muted">· ₲ {money(p.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <select className={selectClass} value={formato} onChange={(e) => setFormato(e.target.value as keyof typeof FORMATOS)}>
            {Object.entries(FORMATOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input className={fieldClass + " max-w-56"} placeholder="Etiqueta (ej: Oferta, Nuevo)" value={titular} onChange={(e) => setTitular(e.target.value)} />
        </div>
      </div>

      {producto ? (
        <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_1fr]">
          <canvas ref={canvasRef} className="w-full rounded-lg ring-1 ring-line" aria-label="Vista previa" />
          <div className="flex flex-col gap-3">
            <button type="button" className={btnPrimary} onClick={descargar}>Descargar imagen (PNG)</button>
            <textarea className="min-h-56 w-full rounded-md border border-line bg-paper p-3 text-sm text-navy" readOnly value={texto} aria-label="Texto para la publicación" />
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                void navigator.clipboard?.writeText(texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); });
              }}
            >
              {copiado ? "¡Copiado!" : "Copiar texto"}
            </button>
            <p className="text-xs text-muted">{orderLineName(producto)}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
