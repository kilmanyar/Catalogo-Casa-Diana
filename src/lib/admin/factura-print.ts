import type { FacturaConfig, FacturaRow } from "./facturacion";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
const g = (n: number) => "₲ " + Math.round(n).toLocaleString("es-PY");

/** Abre la factura lista para imprimir. IVA 10% incluido en el precio. */
export function abrirFactura(f: FacturaRow, c: FacturaConfig) {
  const filas = f.detalle.items
    .map((i) => `<tr><td>${i.qty}</td><td>${esc(i.nombre)}</td><td class="r">${g(i.precio)}</td><td class="r">${g(i.subtotal)}</td></tr>`)
    .join("");
  const total = Number(f.total);
  const iva10 = Number(f.iva10);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Factura ${esc(f.numero)}</title>
<style>body{font:13px system-ui,sans-serif;max-width:700px;margin:20px auto;padding:0 16px;color:#111}
h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:10px}td,th{padding:5px 4px;border-bottom:1px solid #ccc;text-align:left}
.r{text-align:right}.box{border:1px solid #111;padding:8px;margin-top:8px}.m{color:#555;font-size:11px}.anul{color:#b00;font-weight:700;font-size:18px}@media print{button{display:none}}</style></head><body>
<div class="box"><h1>${esc(c.razon_social)}</h1>
RUC: ${esc(c.ruc)}<br>${esc(c.direccion)}${c.telefono ? " · Tel. " + esc(c.telefono) : ""}<br>
Timbrado N° ${esc(c.timbrado)} · Vigencia: ${c.vigencia_desde ? new Date(c.vigencia_desde).toLocaleDateString("es-PY") : "—"} al ${c.vigencia_hasta ? new Date(c.vigencia_hasta).toLocaleDateString("es-PY") : "—"}<br>
<b>FACTURA N° ${esc(f.numero)}</b> ${f.estado === "anulada" ? '<span class="anul">ANULADA</span>' : ""}</div>
<p>Fecha: ${new Date(f.fecha).toLocaleDateString("es-PY")} · Condición: Contado<br>
Cliente: ${esc(f.cliente_nombre)}<br>RUC / CI: ${esc(f.ruc_ci)}</p>
<table><tr><th>Cant.</th><th>Descripción</th><th class="r">Precio unit.</th><th class="r">Gravadas 10%</th></tr>${filas}
${f.detalle.envio > 0 ? `<tr><td>1</td><td>Envío</td><td class="r">${g(f.detalle.envio)}</td><td class="r">${g(f.detalle.envio)}</td></tr>` : ""}
${f.detalle.descuento > 0 ? `<tr><td></td><td>Descuento (cupón)</td><td></td><td class="r">-${g(f.detalle.descuento)}</td></tr>` : ""}
<tr><td colspan="3"><b>TOTAL A PAGAR</b></td><td class="r"><b>${g(total)}</b></td></tr></table>
<p>Liquidación del IVA: (10%) ${g(iva10)} · Total IVA: ${g(iva10)}</p>
<p class="m">Original: cliente · Duplicado: archivo tributario. Precios con IVA incluido.</p>
<button onclick="print()">Imprimir</button></body></html>`);
  w.document.close();
}
