import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, X } from "lucide-react";
import { STORE } from "@/lib/catalog";

export function FaqDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openQ, setOpenQ] = useState<string | null>(STORE.faq[0]?.q ?? null);

  useEffect(() => {
    if (open) setOpenQ(STORE.faq[0]?.q ?? null);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-dvh overflow-y-auto overscroll-contain rounded-t-2xl bg-bg focus:outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-bg px-5 pt-5 pb-2">
            <div>
              <Dialog.Title className="font-display text-2xl text-ink">Preguntas frecuentes</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-navy">
                Seleccioná una pregunta para ver la respuesta.
              </Dialog.Description>
            </div>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-full text-navy" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="px-5 pb-8">
            {STORE.faq.map((item, index) => {
              const isOpen = openQ === item.q;
              return (
                <div key={item.q} id={"faq-" + index} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => {
                      const next = isOpen ? null : item.q;
                      setOpenQ(next);
                      if (next) {
                        requestAnimationFrame(() => {
                          document.getElementById("faq-" + index)?.scrollIntoView({ block: "nearest" });
                        });
                      }
                    }}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-navy"
                  >
                    {item.q}
                    <ChevronDown className={"size-4 shrink-0 transition-transform " + (isOpen ? "rotate-180" : "")} aria-hidden />
                  </button>
                  {isOpen ? (
                    <p className="mb-3 rounded-lg bg-paper px-3 py-3 text-sm leading-relaxed text-navy ring-1 ring-line">{item.a}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
