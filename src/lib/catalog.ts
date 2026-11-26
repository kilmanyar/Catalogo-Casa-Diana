import raw from "@/data/catalog.json";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  priceCash: number;
  description: string;
  stock: number | null;
  image: string | null;
  image2: string | null;
  genero: string | null;
  familia: string | null;
  notas: string | null;
  temporada: string | null;
  momento: string | null;
  duracion: string | null;
  proyeccion: string | null;
  perfumeType: string | null;
  propiedades: string | null;
  uso: string | null;
  tipoPiel: string | null;
  englishName: string | null;
  inspirado?: string | null;
  etiqueta?: "oferta" | "nuevo" | "mas_vendido" | null;
  precioAntes?: number | null;
};

export type FaqItem = { q: string; a: string };

export type DeliveryMode = "" | "pickup" | "shipping";
export type PaymentMode = "" | "card" | "cash";

export type Profile = {
  name: string;
  phone: string;
  ruc: string;
  payment: PaymentMode;
  delivery: DeliveryMode;
  address: string;
  houseNumber: string;
  apartment: string;
  neighborhood: string;
  city: string;
  department: string;
  references: string;
  wrist: string;
};

export const EMPTY_PROFILE: Profile = {
  name: "",
  phone: "",
  ruc: "",
  payment: "",
  delivery: "",
  address: "",
  houseNumber: "",
  apartment: "",
  neighborhood: "",
  city: "",
  department: "",
  references: "",
  wrist: "",
};

export const DEPARTMENTS = [
  "Asunción",
  "Central",
  "Alto Paraná",
  "Alto Paraguay",
  "Amambay",
  "Boquerón",
  "Caaguazú",
  "Caazapá",
  "Canindeyú",
  "Concepción",
  "Cordillera",
  "Guairá",
  "Itapúa",
  "Misiones",
  "Ñeembucú",
  "Paraguarí",
  "Presidente Hayes",
  "San Pedro",
] as const;

export const PICKUP = {
  street: "Francisco Acuña de Figueroa 1056",
  cross: "casi Jóvenes Mártires por la Democracia",
  city: "Lambaré, Paraguay",
  query: "Francisco Acuña de Figueroa 1056 casi Jóvenes Mártires por la Democracia, Lambaré, Paraguay",
};

export const PICKUP_MAPS = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PICKUP.query)}`;
export const PICKUP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(PICKUP.query)}&z=17&output=embed`;
export const INSTAGRAM = "https://www.instagram.com/casadianapy/";
export const INSTAGRAM_HANDLE = "@casadianapy";

export const SOCIALS = [
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/casadianapy/" },
  { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@casadianapy" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com/casadianapy" },
] as const;

type CatalogFile = {
  storeName: string;
  tagline: string;
  whatsapp: string;
  logo: string;
  faq: FaqItem[];
  openDays: number[];
  openHour: number;
  closeHour: number;
  products: Product[];
};

const catalog = raw as CatalogFile;

export const STORE = {
  name: catalog.storeName,
  tagline: catalog.tagline,
  whatsapp: catalog.whatsapp,
  logo: catalog.logo,
  faq: catalog.faq,
  openDays: catalog.openDays,
  openHour: catalog.openHour,
  closeHour: catalog.closeHour,
};

export const PRODUCTS: Product[] = catalog.products;

// Decants are stored as independent products (`${baseId}_d5` / `${baseId}_d10`)
// so the cart/order code (keyed by plain product id) doesn't need to be
// variant-aware. For browsing/listing we show a single card per fragrance
// (the 5mL entry), letting the shopper pick 5mL or 10mL from the product
// detail view.
export const BROWSE_PRODUCTS: Product[] = PRODUCTS.filter((p) => !p.id.endsWith("_d10"));

export const CATEGORIES = [
  { id: "perfumes", label: "Perfumes" },
  { id: "decants", label: "Decants" },
  { id: "cosmeticos", label: "Cosméticos" },
  { id: "maquillaje", label: "Maquillaje" },
  { id: "relojes_masculino", label: "Relojes hombre" },
  { id: "relojes_femenino", label: "Relojes mujer" },
  { id: "accesorios", label: "Accesorios" },
  { id: "suplementos", label: "Suplementos" },
] as const;

export const PERFUME_TYPES = ["Diseñador", "Nicho", "Árabes"] as const;
export const GENDERS = ["Femenino", "Masculino", "Unisex"] as const;

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
const order = new Map(PRODUCTS.map((p, i) => [p.id, i]));

export function productById(id: string) {
  return byId.get(id);
}

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function countInCategory(id: string) {
  return BROWSE_PRODUCTS.filter((p) => p.category === id).length;
}

export function categoryCover(id: string) {
  return BROWSE_PRODUCTS.find((p) => p.category === id && p.image && !isSoldOut(p)) ?? null;
}

export function brandOf(p: Product) {
  const m = p.description.match(/Marca:\s*([^·]+)/i);
  return m ? m[1].trim() : "";
}

export function presentationOf(p: Product) {
  const m = p.description.match(/Presentación:\s*([^·]+)/i);
  return m ? m[1].trim() : "";
}

export function isDecant(p: Product) {
  return p.category === "decants";
}

export function decantSizeMl(p: Product): number | null {
  const m = p.id.match(/_d(5|10)$/);
  return m ? Number(m[1]) : null;
}

export function decantBaseId(p: Product) {
  return p.id.replace(/_d(5|10)$/, "");
}

/** For a decant product, returns the sibling product of the other size (5↔10). */
export function decantSibling(p: Product): Product | undefined {
  const size = decantSizeMl(p);
  if (!size) return undefined;
  const other = size === 5 ? 10 : 5;
  return byId.get(`${decantBaseId(p)}_d${other}`);
}

/** "Decant 5 mL" / "Decant 10 mL" for decant products, "" otherwise — used to
 * disambiguate cart lines and the WhatsApp order text, since both sizes
 * share the same product name. */
export function decantLabel(p: Product) {
  const ml = decantSizeMl(p);
  return ml ? `Decant ${ml} mL` : "";
}

export function orderLineName(p: Product) {
  const label = decantLabel(p);
  return label ? `${p.name} — ${label}` : p.name;
}

export function isSoldOut(p: Product) {
  return p.stock === 0;
}

export function maxQty(p: Product) {
  if (isSoldOut(p) || p.price <= 0) return 0;
  if (typeof p.stock === "number") return Math.max(0, p.stock);
  return 12;
}

export function cashUnit(p: Product) {
  if (p.priceCash > 0 && p.priceCash < p.price) return p.priceCash;
  return p.price;
}

export function cashDiscount(p: Product) {
  if (p.price > 0 && p.priceCash > 0 && p.priceCash < p.price) {
    return Math.round((1 - p.priceCash / p.price) * 100);
  }
  return 0;
}

export function money(n: number) {
  return new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function matchesQuery(p: Product, query: string) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = norm(
    [p.name, p.englishName, p.inspirado, p.description, p.notas, p.familia, p.propiedades, p.perfumeType, brandOf(p)]
      .filter(Boolean)
      .join(" "),
  );
  return words.every((w) => hay.includes(w));
}

export type SortKey = "suggested" | "price_asc" | "price_desc" | "name";

export function filterProducts(
  list: Product[],
  opts: {
    category: string;
    query: string;
    brand: string;
    perfumeType: string;
    gender: string;
    onlyIds?: Record<string, true> | null;
    sort: SortKey;
  },
) {
  const out = list.filter((p) => {
    if (opts.onlyIds && !opts.onlyIds[p.id]) return false;
    if (opts.category !== "all" && p.category !== opts.category) return false;
    if (!matchesQuery(p, opts.query)) return false;
    const isPerfumeLike = opts.category === "perfumes" || opts.category === "decants";
    if (isPerfumeLike && opts.perfumeType !== "all" && p.perfumeType !== opts.perfumeType) return false;
    if (isPerfumeLike && opts.gender !== "all" && p.genero !== opts.gender) return false;
    if (opts.brand !== "all" && brandOf(p) !== opts.brand) return false;
    return true;
  });
  const sold = (p: Product) => (isSoldOut(p) ? 1 : 0);
  out.sort((a, b) => {
    const availability = sold(a) - sold(b);
    if (opts.sort === "price_asc") return availability || cashUnit(a) - cashUnit(b);
    if (opts.sort === "price_desc") return availability || cashUnit(b) - cashUnit(a);
    if (opts.sort === "name") return availability || a.name.localeCompare(b.name, "es");
    return availability || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
  });
  return out;
}

export function brandsIn(list: Product[]) {
  const set = new Set<string>();
  for (const p of list) {
    const b = brandOf(p);
    if (b) set.add(b);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function lastUnits(limit = 12) {
  const picked: Product[] = [];
  for (const cat of CATEGORIES) {
    const hits = BROWSE_PRODUCTS.filter((p) => p.category === cat.id && p.stock === 1 && p.image).slice(0, 2);
    picked.push(...hits);
  }
  return picked.slice(0, limit);
}

export function relatedTo(p: Product) {
  const brand = brandOf(p);
  const pool = BROWSE_PRODUCTS;
  const excludeId = isDecant(p) ? decantBaseId(p) : p.id;
  const sameBrand = pool.filter(
    (x) => decantBaseId(x) !== excludeId && !isSoldOut(x) && x.price > 0 && brand && brandOf(x) === brand,
  );
  const sameCat = pool.filter(
    (x) => decantBaseId(x) !== excludeId && !isSoldOut(x) && x.price > 0 && x.category === p.category && brandOf(x) !== brand,
  );
  return [...sameBrand, ...sameCat].slice(0, 8);
}

export function specsOf(p: Product) {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value && value.trim()) rows.push({ label, value: value.trim() });
  };
  add("Marca", brandOf(p));
  add("Presentación", presentationOf(p));
  add("Tipo", p.perfumeType);
  add("Género", p.genero);
  add("Familia", p.familia);
  add("Temporada", p.temporada);
  add("Momento", p.momento);
  add("Duración", p.duracion);
  add("Proyección", p.proyeccion);
  add("Tipo de piel", p.tipoPiel);
  if (p.englishName) add("Referencia", p.englishName);
  if (p.inspirado) add("Inspirado en", p.inspirado);
  return rows;
}

export const FAIRS = "Luque, San Lorenzo, Lambaré y Mariano Roque Alonso";
export const FAIR_WHEN = "La atención es solo los sábados o los domingos, según el calendario de cada feria.";

export function asuncionClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Asuncion",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (hour === 24) hour = 0;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[wd] ?? 0, hour };
}

export function isLocalOpen(now = new Date()) {
  const { day, hour } = asuncionClock(now);
  return (day === 0 || day === 6) && hour >= 9 && hour < 17;
}

export type OfertaPublica = { productId: string; etiqueta: string; precioOferta: number | null };

/** Aplica una oferta/etiqueta al producto: baja el precio (efectivo = tarjeta / 1,05) y guarda el precio anterior. */
export function conOferta(p: Product, map: Record<string, OfertaPublica>): Product {
  const o = map[p.id];
  if (!o) return p;
  const etiqueta = (["oferta", "nuevo", "mas_vendido"].includes(o.etiqueta) ? o.etiqueta : null) as Product["etiqueta"];
  if (etiqueta === "oferta" && o.precioOferta && p.price > 0 && o.precioOferta < p.price) {
    return { ...p, etiqueta, precioAntes: p.price, price: o.precioOferta, priceCash: Math.round(o.precioOferta / 1.05) };
  }
  return { ...p, etiqueta: etiqueta === "oferta" ? null : etiqueta };
}

export const ETIQUETA_TEXTO: Record<string, string> = { oferta: "Oferta", nuevo: "Nuevo", mas_vendido: "Más vendido" };

export function whatsappHref(text: string) {
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function consultText(p: Product) {
  const lines = [`Hola, quisiera consultar este producto de ${STORE.name}:`, "", orderLineName(p)];
  if (p.price > 0) lines.push(`Precio tarjeta: ₲ ${money(p.price)}`);
  if (cashDiscount(p) > 0) lines.push(`Precio en efectivo y transferencia: ₲ ${money(p.priceCash)}`);
  lines.push("", "¿Sigue disponible?");
  return lines.join("\n");
}

export function buildOrderMessage(opts: {
  code: string;
  items: { product: Product; qty: number }[];
  profile: Profile;
  gift: boolean;
  giftMessage: string;
  coupon?: { code: string; amount: number } | null;
}) {
  const { code, items, profile, gift, giftMessage, coupon } = opts;
  const payCash = profile.payment === "cash";
  const unit = (product: Product) => (payCash ? cashUnit(product) : product.price);
  const subtotal = items.reduce((sum, item) => sum + unit(item.product) * item.qty, 0);
  const total = Math.max(0, subtotal - (coupon?.amount ?? 0));
  const when = new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const rule = "------------------------------";
  const detail = items.map((item, index) => {
    const amount = unit(item.product) * item.qty;
    return `${index + 1}. ${orderLineName(item.product)}\n   ${item.qty} u.    ₲ ${money(amount)}`;
  });
  const lines = [
    "CASA DIANA",
    "Comprobante de pedido",
    rule,
    `N.º ${code}`,
    when,
    "",
    "CLIENTE",
    `Nombre: ${profile.name.trim()}`,
    `Teléfono: ${profile.phone.trim()}`,
    `CI o RUC: ${profile.ruc.trim()}`,
    "",
    "DETALLE",
    ...detail,
    "",
    "MEDIO DE PAGO",
    payCash ? "Efectivo y transferencia" : "Tarjeta",
    ...(coupon && coupon.amount > 0 ? [`Cupón ${coupon.code}: -₲ ${money(coupon.amount)}`] : []),
    `TOTAL A ABONAR: ₲ ${money(total)}`,
    "",
    "ENTREGA",
  ];
  if (profile.delivery === "pickup") {
    lines.push("Retiro en el local");
  } else {
    lines.push(
      "Consulta de envío. No confirma el envío.",
      `Dirección: ${profile.address.trim()}`,
      `N.º de casa: ${profile.houseNumber.trim()}`,
      `Departamento o piso: ${profile.apartment.trim()}`,
      `Barrio: ${profile.neighborhood.trim()}`,
      `Ciudad: ${profile.city.trim()}`,
      `Departamento: ${profile.department.trim()}`,
      `Referencias: ${profile.references.trim()}`,
    );
  }
  if (profile.wrist.trim()) lines.push("", `Medida de muñeca: ${profile.wrist.trim()} cm`);
  if (gift) {
    lines.push("", giftMessage.trim() ? `Regalo. Tarjetita: "${giftMessage.trim()}"` : "Regalo. Agregar tarjetita.");
  }
  lines.push(
    "",
    rule,
    "La entrega se realiza únicamente cuando el artículo está abonado en su totalidad.",
    "Este comprobante no es una factura. El pedido se confirma por WhatsApp.",
  );
  return lines.join("\n");
}

export function orderCode(seq: number) {
  return `CD-${String(seq).padStart(4, "0")}`;
}

export function checkoutIssues(profile: Profile, hasWatch: boolean) {
  const issues: { field: keyof Profile; message: string }[] = [];
  const nameParts = profile.name.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) issues.push({ field: "name", message: "Escribí nombre y apellido. Ejemplo: Juan Pérez." });
  if (profile.phone.replace(/\D/g, "").length < 6) issues.push({ field: "phone", message: "El teléfono es obligatorio. Ejemplo: 0981 654 321." });
  if (profile.ruc.replace(/\D/g, "").length < 5) issues.push({ field: "ruc", message: "El CI o RUC es obligatorio para facturar. Ejemplo: 1234567-8." });
  if (profile.payment !== "card" && profile.payment !== "cash") {
    issues.push({ field: "payment", message: "Elegí el medio de pago: tarjeta, o efectivo y transferencia." });
  }
  if (profile.delivery !== "pickup" && profile.delivery !== "shipping") {
    issues.push({ field: "delivery", message: "Elegí retiro en el local o consultar envío." });
  }
  if (profile.delivery === "shipping") {
    if (profile.address.trim().length < 3) issues.push({ field: "address", message: "Falta la dirección. Ejemplo: Av. España." });
    if (profile.houseNumber.trim().length < 1) issues.push({ field: "houseNumber", message: "Falta el número de casa. Ejemplo: 1234." });
    if (profile.apartment.trim().length < 1) issues.push({ field: "apartment", message: "Falta el departamento. Si es una casa, escribí Casa. Ejemplo: 4B." });
    if (profile.neighborhood.trim().length < 2) issues.push({ field: "neighborhood", message: "Falta el barrio. Ejemplo: Villa Morra." });
    if (profile.city.trim().length < 2) issues.push({ field: "city", message: "Falta la ciudad. Ejemplo: Lambaré." });
    if (!DEPARTMENTS.includes(profile.department as (typeof DEPARTMENTS)[number])) {
      issues.push({ field: "department", message: "Elegí el departamento. Ejemplo: Central." });
    }
    if (profile.references.trim().length < 3) issues.push({ field: "references", message: "Faltan referencias para llegar. Ejemplo: Portón negro, frente a la despensa." });
  }
  if (hasWatch) {
    const wrist = Number(profile.wrist.replace(",", ".").trim());
    if (!profile.wrist.trim() || Number.isNaN(wrist) || wrist < 10 || wrist > 30) {
      issues.push({ field: "wrist", message: "Para el reloj, la medida de muñeca es obligatoria. Ejemplo: 16." });
    }
  }
  return issues;
}

export function checkoutError(profile: Profile, hasWatch: boolean) {
  return checkoutIssues(profile, hasWatch)[0]?.message ?? "";
}
