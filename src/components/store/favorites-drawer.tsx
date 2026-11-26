import * as Dialog from "@radix-ui/react-dialog";
import { ShoppingBag, X } from "lucide-react";
import { decantLabel, isSoldOut, money, type Product } from "@/lib/catalog";
import { btnPrimary } from "@/components/store/ui";

export function FavoritesDrawer({
  open,
  products,
  onClose,
  onOpenProduct,
  onAdd,
  onRemove,
}: {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="fixed inset-0 z-50 flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg focus:outline-none sm:inset-y-0 sm:left-auto sm:w-full sm:max-w-md">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="font-display text-xl text-ink">Favoritos · {products.length}</Dialog.Title>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-full text-navy" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {products.length === 0 ? (
              <Dialog.Description className="py-10 text-center text-sm text-navy">
                Todavía no guardaste favoritos. El corazón de cada producto los deja acá.
              </Dialog.Description>
            ) : (
              <>
                <Dialog.Description className="sr-only">Productos que guardaste.</Dialog.Description>
                <ul className="flex flex-col gap-3">
                  {products.map((product) => {
                    const sold = isSoldOut(product);
                    return (
                      <li key={product.id} className="flex gap-3 rounded-lg bg-paper p-2 ring-1 ring-line">
                        <button type="button" onClick={() => onOpenProduct(product.id)} className="size-16 shrink-0 overflow-hidden rounded-md bg-bg">
                          {product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : null}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => onOpenProduct(product.id)} className="line-clamp-2 text-left text-sm font-semibold text-navy">
                            {product.name}
                          </button>
                          {decantLabel(product) ? <p className="text-xs font-semibold text-orange">{decantLabel(product)}</p> : null}
                          <p className="text-sm text-navy">{product.price > 0 ? `₲ ${money(product.price)}` : "Consultar"}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className={btnPrimary + " px-3"} disabled={sold || product.price <= 0} onClick={() => onAdd(product.id)}>
                              <ShoppingBag className="size-4" aria-hidden />
                              {sold ? "Agotado" : "Agregar"}
                            </button>
                            <button type="button" className="h-11 px-2 text-sm font-semibold text-coral" onClick={() => onRemove(product.id)}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
