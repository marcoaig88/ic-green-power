"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

const DISMISS_KEY = "icgp_install_hint_dismissed";

export function InstallAppHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // ignore
    }

    if (isIos()) {
      setShowIos(true);
      setVisible(true);
      return;
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    setDeferred(null);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="mb-4 rounded-xl border border-brand/30 bg-brand-soft/80 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-brand-deep">
            Aggiungi a Home
          </p>
          {showIos ? (
            <p className="mt-1 text-sm text-ink">
              Su iPhone/iPad: tocca{" "}
              <span className="font-semibold">Condividi</span> e poi{" "}
              <span className="font-semibold">Aggiungi a Home</span>.
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink">
              Installa l&apos;app sul telefono per aprire Note spese come
              scorciatoia.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {!showIos && deferred && (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              Installa
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-muted hover:border-brand hover:text-ink"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
