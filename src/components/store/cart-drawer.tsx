import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Gift, MapPin, Minus, Plus, Trash2, X } from "lucide-react";
import {
  DEPARTMENTS,
  PICKUP,
  PICKUP_EMBED,
  PICKUP_MAPS,
  buildOrderMessage,
  cashUnit,
  checkoutIssues,
  decantLabel,
  money,
  whatsappHref,
  type Product,
  type Profile,
} from "@/lib/catalog";
import { btnOrange, btnPrimary, fieldClass, selectClass } from "@/components/store/ui";
import { ticketFileName, ticketPdf } from "@/lib/ticket-pdf";
import { registrarPedidoDesdeCarrito } from "@/lib/admin/pedidos";
import { validarCupon } from "@/lib/admin/cupones";

type Line = { product: Product; qty: number };

function Field({
  id,
  label,
  value,
  onChange,
  autoComplete,
  inputMode,
  example,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: "text" | "tel" | "decimal";
  example: string;
  invalid: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-navy">{label} *</span>
      <input
        id={id}
        value={value}
        required
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={"Ejemplo: " + example}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass + (invalid ? " border-coral" : "") + " placeholder:text-muted"}
      />
      <span className="text-xs text-muted">Ejemplo: {example}</span>
    </label>
  );
}

function choiceClass(on: boolean) {
  return "min-h-11 rounded-md px-2 py-2 text-sm font-semibold leading-tight " + (on ? "bg-navy text-paper" : "bg-paper text-navy ring-1 ring-line");
}

export function CartDrawer({
  open,
  lines,
  profile,
  onClose,
  onSetQty,
  onRemove,
  onProfile,
  onForgetProfile,
  onTakeCode,
  onClear,
  onOpenProduct,
}: {
  open: boolean;
  lines: Line[];
  profile: Profile;
  onClose: () => void;
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onProfile: (patch: Partial<Profile>) => void;
  onForgetProfile: () => void;
  onTakeCode: () => string;
  onClear: () => void;
  onOpenProduct: (id: string) => void;
}) {
  const [gift, setGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pedidoId, setPedidoId] = useState<number | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; amount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const card = lines.reduce((s, i) => s + i.product.price * i.qty, 0);
  const cash = lines.reduce((s, i) => s + cashUnit(i.product) * i.qty, 0);
  const payBase = profile.payment === "cash" ? cash : card;
  const hasWatch = lines.some((i) => i.product.category.startsWith("relojes"));
  const count = lines.reduce((s, i) => s + i.qty, 0);

  // Revalida el cupón cuando cambia el total (cantidades o medio de pago).
  const couponCode = coupon?.code;
  useEffect(() => {
    if (!couponCode) return;
    let alive = true;
    validarCupon({ data: { codigo: couponCode, subtotal: payBase } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) setCoupon({ code: r.codigo, amount: r.descuento });
        else {
          setCoupon(null);
          setCouponMsg(r.mensaje);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [couponCode, payBase]);

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponMsg(null);
    try {
      const r = await validarCupon({ data: { codigo: code, subtotal: payBase } });
      if (r.ok) {
        setCoupon({ code: r.codigo, amount: r.descuento });
        setCouponInput("");
        setCouponMsg(r.mensaje);
      } else {
        setCouponMsg(r.mensaje);
      }
    } catch {
      setCouponMsg("No se pudo validar el cupón.");
    }
  };

  const issues = checkoutIssues(profile, hasWatch);
  const invalid = new Set(tried ? issues.map((issue) => issue.field) : []);

  const submit = () => {
    if (lines.length === 0) return;
    if (issues.length > 0) {
      setTried(true);
      const node = document.getElementById("checkout-" + issues[0].field);
      node?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setTried(false);
    const code = onTakeCode();
    const msg = buildOrderMessage({ code, items: lines, profile, gift, giftMessage, coupon });
    setReceipt(msg);
    setPedidoId(null);
    setCopied(false);
    void navigator.clipboard.writeText(msg).then(() => setCopied(true)).catch(() => setCopied(false));

    // Registro silencioso para el panel de administración (no bloquea ni
    // afecta el flujo del cliente si falla — es solo para que el pedido
    // aparezca en /admin/pedidos). El total refleja el medio de pago elegido.
    const total = profile.payment === "cash" ? cash : card;
    void registrarPedidoDesdeCarrito({
      data: {
        clienteNombre: profile.name || undefined,
        clienteTelefono: profile.phone || undefined,
        metodoPago: profile.payment === "cash" ? "efectivo" : profile.payment === "card" ? "tarjeta" : undefined,
        total,
        cupon: coupon?.code,
        items: lines.map(({ product, qty }) => ({
          productId: product.id,
          productName: product.name,
          qty,
          precioUnitario: profile.payment === "cash" ? cashUnit(product) : product.price,
        })),
      },
    })
      .then((r) => setPedidoId(r.id))
      .catch(() => {
        /* best-effort: el comprobante y el WhatsApp ya quedaron listos igual */
      });
  };

  const savePdf = () => {
    if (!receipt) return;
    const file = new File([ticketPdf(receipt)], ticketFileName(receipt), { type: "application/pdf" });
    const download = () => {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    };
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      void navigator.share({ files: [file], title: "Comprobante Casa Diana" }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        download();
      });
      return;
    }
    download();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReceipt(null);
          setTried(false);
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg focus:outline-none sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="font-display text-xl text-ink">Tu pedido {count > 0 ? `· ${count}` : ""}</Dialog.Title>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-full text-navy" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {receipt ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="flex flex-col gap-3">
                <Dialog.Description className="text-sm text-navy">
                  El comprobante ya está listo. Al abrir WhatsApp se envía con este texto, sin copiarlo. También podés guardarlo en PDF.
                </Dialog.Description>
                {pedidoId ? (
                  <p className="rounded-md bg-paper px-3 py-2 text-sm text-navy ring-1 ring-line">
                    Tu n.º de pedido es <strong>#{pedidoId}</strong>. Podés seguirlo en <a className="font-semibold underline" href="/seguimiento">Seguir mi pedido</a> con tu teléfono.
                  </p>
                ) : null}
                {copied ? <p className="text-xs font-medium text-cash">También quedó copiado por si querés pegarlo en otro lado.</p> : null}
                <article id="order-ticket" className="order-ticket rounded-lg bg-paper px-4 py-5 text-navy ring-1 ring-line">
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{receipt}</pre>
                </article>
                <a className={btnOrange} href={whatsappHref(receipt)} target="_blank" rel="noreferrer">
                  Enviar por WhatsApp
                </a>
                <button type="button" className={btnPrimary} onClick={savePdf}>
                  Guardar PDF
                </button>
                <button
                  type="button"
                  className="h-11 text-sm font-semibold text-coral"
                  onClick={() => {
                    onClear();
                    setReceipt(null);
                    setGift(false);
                    setGiftMessage("");
                    onClose();
                  }}
                >
                  Listo, vaciar carrito
                </button>
              </div>
            </div>
          ) : lines.length === 0 ? (
            <Dialog.Description className="px-4 py-10 text-center text-sm text-navy">
              Todavía no agregaste productos.
            </Dialog.Description>
          ) : (
            <>
              <Dialog.Description className="sr-only">Productos del pedido y datos para el envío y la factura.</Dialog.Description>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Productos elegidos</p>
                <ul className="flex flex-col gap-3">
                  {lines.map(({ product, qty }) => (
                    <li key={product.id} className="flex gap-3 rounded-lg bg-paper p-2 ring-1 ring-line">
                      <button type="button" onClick={() => onOpenProduct(product.id)} className="size-16 shrink-0 overflow-hidden rounded-md bg-bg">
                        {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => onOpenProduct(product.id)} className="line-clamp-2 text-left text-sm font-semibold text-navy">
                          {product.name}
                        </button>
                        {decantLabel(product) ? <p className="text-xs font-semibold text-orange">{decantLabel(product)}</p> : null}
                        <p className="text-sm text-navy">₲ {money(product.price)}</p>
                        {cashUnit(product) < product.price ? (
                          <p className="text-xs font-semibold text-cash">Efectivo y transferencia ₲ {money(cashUnit(product))}</p>
                        ) : null}
                        <div className="mt-1 flex items-center gap-2">
                          <button type="button" aria-label="Menos" className="flex size-11 items-center justify-center rounded-md ring-1 ring-line" onClick={() => onSetQty(product.id, qty - 1)}>
                            <Minus className="size-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button type="button" aria-label="Más" className="flex size-11 items-center justify-center rounded-md ring-1 ring-line" onClick={() => onSetQty(product.id, qty + 1)}>
                            <Plus className="size-4" />
                          </button>
                          <button type="button" aria-label="Quitar" className="ml-auto flex size-11 items-center justify-center text-coral" onClick={() => onRemove(product.id)}>
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-col gap-5 pb-2">
                  <div className="rounded-lg bg-paper p-3 ring-1 ring-line">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-navy">Total con tarjeta</span>
                      <span className="font-display text-lg font-semibold text-navy">₲ {money(card)}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-cash">Total efectivo/transferencia</span>
                      <span className="font-display text-lg font-semibold text-cash">₲ {money(cash)}</span>
                    </div>
                    {coupon && coupon.amount > 0 ? (
                      <div className="mt-1 flex items-baseline justify-between gap-3">
                        <span className="text-sm font-semibold text-orange">Cupón {coupon.code}</span>
                        <span className="font-semibold text-orange">-₲ {money(coupon.amount)}</span>
                      </div>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <input
                        className={fieldClass}
                        placeholder="¿Tenés un cupón?"
                        aria-label="Código de cupón"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") void applyCoupon(); }}
                      />
                      <button type="button" className={btnPrimary} onClick={() => void applyCoupon()}>Aplicar</button>
                    </div>
                    {couponMsg ? <p className="mt-1 text-xs font-medium text-navy">{couponMsg}</p> : null}
                    {coupon ? (
                      <button type="button" className="mt-1 text-xs text-muted underline" onClick={() => { setCoupon(null); setCouponMsg(null); }}>Quitar cupón</button>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium text-navy">
                    <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-orange" />
                    <Gift className="size-4 text-orange" aria-hidden />
                    Es un regalo
                  </label>
                  {gift ? (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-navy">Texto de la tarjetita</span>
                      <textarea
                        value={giftMessage}
                        placeholder="Ejemplo: Feliz cumpleaños, Ana"
                        onChange={(e) => setGiftMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-base text-navy outline-none placeholder:text-muted focus:border-orange"
                      />
                      <span className="text-xs text-muted">Ejemplo: Feliz cumpleaños, Ana</span>
                    </label>
                  ) : null}
                  <div className="grid gap-3">
                    <h3 className="font-display text-lg text-ink">Para facturar</h3>
                    <Field id="checkout-name" invalid={invalid.has("name")} label="Nombre y apellido" value={profile.name} autoComplete="name" example="Juan Pérez" onChange={(name) => onProfile({ name })} />
                    <Field id="checkout-phone" invalid={invalid.has("phone")} label="Teléfono" value={profile.phone} autoComplete="tel" inputMode="tel" example="0981 654 321" onChange={(phone) => onProfile({ phone })} />
                    <Field id="checkout-ruc" invalid={invalid.has("ruc")} label="CI o RUC" value={profile.ruc} example="1234567-8" onChange={(ruc) => onProfile({ ruc })} />
                    <h3 className="mt-2 font-display text-lg text-ink">Medio de pago *</h3>
                    <div id="checkout-payment" className={"grid grid-cols-2 gap-2 rounded-lg p-0.5 " + (invalid.has("payment") ? "ring-2 ring-coral" : "")}>
                      <button type="button" aria-pressed={profile.payment === "card"} className={choiceClass(profile.payment === "card")} onClick={() => onProfile({ payment: "card" })}>
                        Tarjeta
                        <span className="mt-0.5 block text-xs font-medium">₲ {money(card)}</span>
                      </button>
                      <button type="button" aria-pressed={profile.payment === "cash"} className={choiceClass(profile.payment === "cash")} onClick={() => onProfile({ payment: "cash" })}>
                        Efectivo y transferencia
                        <span className="mt-0.5 block text-xs font-medium">₲ {money(cash)}</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted">Al retirar podés abonar con tarjeta o QR (Tokefon) o en efectivo; el precio depende del medio que elijas.</p>
                    <h3 className="mt-2 font-display text-lg text-ink">¿Cómo lo recibís? *</h3>
                    <div id="checkout-delivery" className={"grid grid-cols-2 gap-2 rounded-lg p-0.5 " + (invalid.has("delivery") ? "ring-2 ring-coral" : "")}>
                      <button type="button" aria-pressed={profile.delivery === "pickup"} className={choiceClass(profile.delivery === "pickup")} onClick={() => onProfile({ delivery: "pickup" })}>
                        Retiro en el local
                      </button>
                      <button type="button" aria-pressed={profile.delivery === "shipping"} className={choiceClass(profile.delivery === "shipping")} onClick={() => onProfile({ delivery: "shipping" })}>
                        Consultar envío
                      </button>
                    </div>
                    {profile.delivery === "pickup" ? (
                      <div className="rounded-lg bg-paper p-4 text-center ring-1 ring-line">
                        <p className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                          <MapPin className="size-4 text-orange" aria-hidden />
                          Retirás en Casa Diana
                        </p>
                        <p className="mt-2 font-medium text-navy">{PICKUP.street}</p>
                        <p className="text-navy">{PICKUP.cross}</p>
                        <p className="text-sm text-muted">{PICKUP.city}</p>
                        <p className="mt-2 text-sm text-navy">La entrega se realiza únicamente cuando el artículo está abonado en su totalidad.</p>
                        <p className="mt-2 text-sm text-navy">Local abierto: sábados y domingos, de 09 a 17hs. De lunes a viernes, el retiro se coordina por WhatsApp.</p>
                        <div className="mx-auto mt-3 max-w-sm overflow-hidden rounded-lg ring-1 ring-line">
                          <iframe title="Mapa de Casa Diana" src={PICKUP_EMBED} className="h-32 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                        </div>
                        <a className={btnPrimary + " mt-3 w-full"} href={PICKUP_MAPS} target="_blank" rel="noreferrer">
                          Abrir en Google Maps
                        </a>
                      </div>
                    ) : null}
                    {profile.delivery === "shipping" ? (
                      <>
                        <h3 className="font-display text-lg text-ink">Consulta de envío</h3>
                        <p className="text-sm text-navy">Por el momento, los pedidos están disponibles solo para retiro en tienda. Si necesitás envío, completá los datos para consultarlo por WhatsApp. Esta consulta no confirma el envío.</p>
                        <Field id="checkout-address" invalid={invalid.has("address")} label="Dirección" value={profile.address} autoComplete="street-address" example="Av. España" onChange={(address) => onProfile({ address })} />
                        <Field id="checkout-houseNumber" invalid={invalid.has("houseNumber")} label="N° de casa" value={profile.houseNumber} example="1234" onChange={(houseNumber) => onProfile({ houseNumber })} />
                        <Field id="checkout-apartment" invalid={invalid.has("apartment")} label="Departamento o piso" value={profile.apartment} example="4B" onChange={(apartment) => onProfile({ apartment })} />
                        <p className="-mt-2 text-xs text-muted">Si es una casa, escribí Casa.</p>
                        <Field id="checkout-neighborhood" invalid={invalid.has("neighborhood")} label="Barrio" value={profile.neighborhood} example="Villa Morra" onChange={(neighborhood) => onProfile({ neighborhood })} />
                        <Field id="checkout-city" invalid={invalid.has("city")} label="Ciudad" value={profile.city} autoComplete="address-level2" example="Lambaré" onChange={(city) => onProfile({ city })} />
                        <label className="flex flex-col gap-1 text-sm" htmlFor="checkout-department">
                          <span className="font-medium text-navy">Departamento *</span>
                          <select
                            id="checkout-department"
                            value={profile.department}
                            aria-invalid={invalid.has("department")}
                            onChange={(e) => onProfile({ department: e.target.value })}
                            className={selectClass + " w-full text-base"}
                          >
                            <option value="">Elegí el departamento</option>
                            {DEPARTMENTS.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                          <span className="text-xs text-muted">Ejemplo: Central</span>
                        </label>
                        <Field id="checkout-references" invalid={invalid.has("references")} label="Referencias" value={profile.references} example="Portón negro, frente a la despensa" onChange={(references) => onProfile({ references })} />
                      </>
                    ) : null}
                    {profile.delivery === "" ? (
                      <p className="text-sm text-navy">Elegí retiro o consultar envío. Es obligatorio.</p>
                    ) : null}
                    {hasWatch ? (
                      <Field id="checkout-wrist" invalid={invalid.has("wrist")} label="Medida de muñeca (cm)" value={profile.wrist} inputMode="decimal" example="16" onChange={(wrist) => onProfile({ wrist })} />
                    ) : null}
                    {hasWatch ? (
                      <p className="text-xs text-navy">Talles de malla: S 14–16 cm, M 16–18 cm, L 18–20 cm, XL 20 cm o más.</p>
                    ) : null}
                  </div>
                  <button type="button" className="text-left text-sm text-muted underline" onClick={onForgetProfile}>
                    Olvidar mis datos en este teléfono
                  </button>
                </div>
              </div>
              <div className="safe-bottom shrink-0 border-t border-line bg-bg px-4 py-3">
                {tried && issues.length > 0 ? (
                  <p role="alert" className="mb-2 text-sm font-medium text-coral">{issues[0].message}</p>
                ) : null}
                <button type="button" className={btnOrange + " w-full"} onClick={submit}>
                  Pedir por WhatsApp
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
