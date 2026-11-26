import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botón "Instalar app": usa el aviso nativo en Android/PC y muestra los pasos en iPhone. */
export function InstalarApp() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(false);
  const [ayuda, setAyuda] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/i.test(ua));
    setInstalada(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalada(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalada || (!evt && !ios)) return null;

  return (
    <>
      <button
        type="button"
        className="faq-link"
        onClick={async () => {
          if (evt) {
            await evt.prompt();
            setEvt(null);
          } else setAyuda((v) => !v);
        }}
      >
        Instalar app
      </button>
      {ayuda ? (
        <p className="w-full text-center text-xs text-muted">
          En iPhone: tocá el botón Compartir de Safari y elegí «Agregar a pantalla de inicio».
        </p>
      ) : null}
    </>
  );
}
