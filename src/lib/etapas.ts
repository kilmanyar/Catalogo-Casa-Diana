export const ETAPA_LABEL: Record<string, string> = {
  recibido: "Pedido recibido",
  preparando: "Preparando tu pedido",
  listo: "Listo para retirar",
  en_camino: "En camino",
  entregado: "Entregado",
};
export const ETAPA_ORDEN = ["recibido", "preparando", "listo", "en_camino", "entregado"];

/** Mensaje de aviso por WhatsApp según la etapa del pedido. */
export function mensajeEtapa(id: number, nombre: string | null, etapa: string, entrega: string): string {
  const hola = `Hola${nombre ? " " + nombre.split(" ")[0] : ""}, te escribimos de Casa Diana por tu pedido #${id}.`;
  const cuerpo: Record<string, string> = {
    recibido: "Recibimos tu pedido y lo estamos revisando.",
    preparando: "Estamos preparando tu pedido.",
    listo: entrega === "delivery" ? "Tu pedido está listo y lo despachamos en breve." : "Tu pedido está listo para retirar. Podés abonar con tarjeta, QR (Tokefon) o efectivo.",
    en_camino: "Tu pedido va en camino.",
    entregado: "Tu pedido fue entregado. ¡Gracias por tu compra!",
  };
  return `${hola} ${cuerpo[etapa] ?? ""}`.trim();
}

export function waLink(telefono: string | null, texto: string): string {
  let d = (telefono ?? "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "595" + d.slice(1);
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}
