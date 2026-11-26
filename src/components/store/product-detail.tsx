import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Heart, Minus, Plus, Share2, ShoppingBag, X } from "lucide-react";
import {
  brandOf,
  categoryLabel,
  decantSibling,
  decantSizeMl,
  isDecant,
  isSoldOut,
  maxQty,
  money,
  presentationOf,
  relatedTo,
  specsOf,
  type Product,
} from "@/lib/catalog";
import { btnOrange, btnPrimary } from "@/components/store/ui";
import { PriceBlock } from "@/components/store/price-block";

export function ProductDetail({
  product,
  favorite,
  inCart,
  justAdded,
  onClose,
  onAdd,
  onToggleFavorite,
  onOpen,
  onContact,
}: {
  product: Product;
  favorite: boolean;
  inCart: number;
  justAdded: boolean;
  onClose: () => void;
  onAdd: (qty: number) => void;
  onToggleFavorite: () => void;
  onOpen: (id: string) => void;
  onContact: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const [photo, setPhoto] = useState(0);
  const sold = isSoldOut(product);
  const max = maxQty(product);
  const room = Math.max(0, max - inCart);
  const photos = [product.image, product.image2].filter((src): src is string => Boolean(src));
  const related = relatedTo(product);
  const perfume = product.category.startsWith("perfumes");
  const decant = isDecant(product);
  const sibling = decant ? decantSibling(product) : undefined;
  const brand = brandOf(product);
  const presentation = presentationOf(product);
  const meta = [brand ? `Marca: ${brand}` : "", presentation ? `Presentación: ${presentation}` : ""].filter(Boolean).join(" · ");
  const labelOf: Record<string, string> = perfume
    ? { Tipo: "Tipo de perfume", Familia: "Familia olfativa", Momento: "Momento del día" }
    : {};
  const detailRows = [
    ...specsOf(product)
      .filter((row) => row.label !== "Marca" && row.label !== "Presentación")
      .map((row) => ({ label: labelOf[row.label] ?? row.label, value: row.value })),
    product.notas ? { label: perfume ? "Notas olfativas" : "Notas", value: product.notas } : null,
    product.propiedades ? { label: "Qué hace", value: product.propiedades } : null,
    product.uso ? { label: "Cómo se usa", value: product.uso } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("p", product.id);
    const payload = { title: product.name, text: `${product.name} · ${brandOf(product) || "Casa Diana"}`, url: url.toString() };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="sheet-center fixed inset-0 z-50 overflow-y-auto bg-bg text-left focus:outline-none sm:inset-6 sm:mx-auto sm:max-w-lg sm:rounded-2xl">
          <div className="relative bg-paper">
            <div className="relative aspect-square overflow-hidden">
              {photos[photo] ? (
                <img src={photos[photo]} alt={product.name} className="h-full w-full object-contain" />
              ) : (
                <span className="flex h-full items-center justify-center font-display text-5xl text-navy/30">{product.name.slice(0, 1)}</span>
              )}
              {sold ? (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/55 font-display tracking-widest text-paper uppercase">Agotado</span>
              ) : null}
            </div>
            <div className="absolute top-3 left-3 flex gap-2">
              <button type="button" onClick={onToggleFavorite} aria-pressed={favorite} aria-label="Favorito" className="flex size-11 items-center justify-center rounded-full bg-paper text-navy shadow-sm ring-1 ring-line">
                <Heart className="size-5" fill={favorite ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={() => void share()} aria-label="Compartir" className="flex size-11 items-center justify-center rounded-full bg-paper text-navy shadow-sm ring-1 ring-line">
                <Share2 className="size-5" />
              </button>
            </div>
            <Dialog.Close className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-navy/80 text-paper" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
            {photos.length > 1 ? (
              <div className="flex gap-2 px-4 pb-3">
                {photos.map((src, i) => (
                  <button key={src} type="button" onClick={() => setPhoto(i)} className={"size-14 overflow-hidden rounded-md ring-2 " + (i === photo ? "ring-orange" : "ring-transparent")}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 px-4 py-4">
            <span className="rounded bg-[#E23A4A] px-2 py-1 text-[11px] font-bold tracking-wide text-white uppercase">{categoryLabel(product.category)}</span>
            <Dialog.Title className="font-display text-3xl leading-tight text-ink">{product.name}</Dialog.Title>
            {meta ? <p className="text-sm text-muted">{meta}</p> : null}
            <Dialog.Description className="sr-only">
              {brandOf(product) || categoryLabel(product.category)} en Casa Diana
            </Dialog.Description>
            <PriceBlock product={product} large />
            {decant && sibling ? (
              <div className="flex gap-2" role="group" aria-label="Tamaño del decant">
                {[product, sibling]
                  .slice()
                  .sort((a, b) => (decantSizeMl(a) ?? 0) - (decantSizeMl(b) ?? 0))
                  .map((opt) => {
                    const ml = decantSizeMl(opt);
                    const active = opt.id === product.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => { if (!active) onOpen(opt.id); }}
                        aria-pressed={active}
                        className={
                          "rounded-md px-4 py-2 text-sm font-semibold ring-1 " +
                          (active ? "bg-navy text-paper ring-navy" : "bg-paper text-navy ring-line")
                        }
                      >
                        {ml} mL
                      </button>
                    );
                  })}
              </div>
            ) : null}
            {typeof product.stock === "number" && product.stock > 0 && product.stock <= 5 ? (
              <p className="text-sm font-semibold text-coral">Quedan {product.stock} {product.stock === 1 ? "unidad" : "unidades"}.</p>
            ) : null}
            {copied ? <p className="text-sm font-medium text-cash">Enlace copiado.</p> : null}
            {detailRows.length > 0 ? (
              <dl className="flex w-full flex-col gap-3 border-t border-line pt-4">
                {detailRows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-[11px] font-semibold tracking-[0.14em] text-[#C4A07A] uppercase">{row.label}</dt>
                    <dd className="mt-0.5 text-[15px] leading-snug text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {product.price <= 0 || sold ? (
              <button type="button" className={btnOrange + " w-full"} onClick={onContact}>
                {sold ? "Avisame cuando vuelva" : "Consultar por WhatsApp"}
              </button>
            ) : (
              <div className="flex w-full items-center gap-3">
                <div className="flex h-11 items-center rounded-md bg-paper ring-1 ring-line">
                  <button type="button" className="flex size-11 items-center justify-center" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{Math.min(qty, Math.max(room, 1))}</span>
                  <button type="button" className="flex size-11 items-center justify-center" aria-label="Más" onClick={() => setQty((q) => Math.min(Math.max(room, 1), q + 1))} disabled={room <= 1}>
                    <Plus className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  className={(justAdded ? "bg-orange hover:bg-orange " : "") + btnPrimary + " min-w-0 flex-1"}
                  disabled={room <= 0}
                  onClick={() => onAdd(Math.min(qty, room))}
                >
                  {justAdded ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
                  {room <= 0 ? "Máximo en el carrito" : justAdded ? "Agregado al carrito" : "Agregar al carrito"}
                </button>
              </div>
            )}
            <button type="button" className="text-sm font-semibold text-navy underline" onClick={onContact}>
              Preguntar por este producto
            </button>
          </div>
          {related.length > 0 ? (
            <div className="px-4 pb-10">
              <h3 className="font-display text-xl text-navy">También te puede gustar</h3>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                {related.map((item) => (
                  <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="w-36 shrink-0 text-left">
                    <span className="block aspect-square overflow-hidden rounded-lg bg-paper ring-1 ring-line">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm font-medium text-navy">{item.name}</span>
                    <span className="text-sm font-semibold text-orange">₲ {money(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
