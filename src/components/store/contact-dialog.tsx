import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, MapPin, MessageCircle, X } from "lucide-react";
import { FAIR_WHEN, FAIRS, PICKUP, PICKUP_MAPS, STORE, whatsappHref } from "@/lib/catalog";
import { SocialLinks } from "@/components/store/social-links";
import { btnOrange, btnPrimary } from "@/components/store/ui";

const PHONE = "+595 986 540 105";

export function ContactDialog({ open, onClose, text }: { open: boolean; onClose: () => void; text?: string }) {
  const [copied, setCopied] = useState(false);
  const hello = text || `Hola, quisiera comunicarme con ${STORE.name}.`;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/55" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-dvh overflow-y-auto overscroll-contain rounded-t-2xl bg-bg p-5 focus:outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-2xl text-ink">Contacto</Dialog.Title>
            <Dialog.Close className="flex size-11 items-center justify-center rounded-full text-navy" aria-label="Cerrar">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-navy">
            Casa Diana atiende las consultas por WhatsApp.
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-3 pb-2 text-sm text-navy">
            <p className="rounded-lg bg-paper px-3 py-3 ring-1 ring-line">
              <span className="block text-xs text-muted">WhatsApp</span>
              <span className="font-display text-xl text-ink">{PHONE}</span>
            </p>
            <p className="rounded-lg bg-paper px-3 py-3 ring-1 ring-line">
              <span className="flex items-center gap-2 font-semibold text-navy">
                <Clock className="size-4 text-orange" aria-hidden />
                Horarios
              </span>
              <span className="mt-1 block">Catálogo para pedidos en línea disponible las 24 horas.</span>
              <span className="mt-1 block">Local abierto: sábados y domingos, de 09 a 17hs, para retiro en tienda.</span>
              <span className="mt-1 block">Los retiros de lunes a viernes se consultan por WhatsApp para coordinar.</span>
            </p>
            <p className="rounded-lg bg-paper px-3 py-3 ring-1 ring-line">
              <span className="block font-semibold text-navy">Ferias</span>
              <span className="mt-1 block">En {FAIRS}. {FAIR_WHEN}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
              <span>
                {PICKUP.street}, {PICKUP.cross}. {PICKUP.city}.
              </span>
            </p>
            <a className="font-semibold text-orange underline" href={PICKUP_MAPS} target="_blank" rel="noreferrer">
              Ver en Google Maps
            </a>
            <SocialLinks />
            {text ? (
              <pre className="overflow-x-auto rounded-lg bg-paper p-3 text-xs leading-relaxed whitespace-pre-wrap text-navy ring-1 ring-line">{hello}</pre>
            ) : null}
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                void navigator.clipboard.writeText(STORE.whatsapp).then(() => setCopied(true));
              }}
            >
              {copied ? "Número copiado" : "Copiar número"}
            </button>
            <a className={btnOrange} href={whatsappHref(hello)} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" aria-hidden />
              Abrir WhatsApp
            </a>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
