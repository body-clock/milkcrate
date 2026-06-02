import { useEffect, useRef } from "react";

type TurnstileWidgetId = string | number;

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        "expired-callback": () => void;
        "error-callback": () => void;
      }) => TurnstileWidgetId;
      remove?: (widgetId: TurnstileWidgetId) => void;
    };
  }
}

interface UseTurnstileOptions {
  enabled: boolean;
  siteKey: string | null | undefined;
  onToken: (token: string) => void;
}

interface UseTurnstileResult {
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
}

export function useTurnstile({
  enabled,
  siteKey,
  onToken,
}: UseTurnstileOptions): UseTurnstileResult {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!enabled || !siteKey || !turnstileRef.current) {return;}
    const script = findOrCreateScript();
    let scriptWithListener: HTMLScriptElement | null = null;

    const render = () => {
      const ref = turnstileRef.current;
      const wid = widgetIdRef;
      if (!window.turnstile || !ref || wid.current !== null) {return;}
      wid.current = window.turnstile.render(ref, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    if (window.turnstile) {render();}
    else {scriptWithListener = script; script.addEventListener("load", render, { once: true });}

    return () => {
      if (scriptWithListener) {scriptWithListener.removeEventListener("load", render);}
      const wid = widgetIdRef.current;
      if (wid !== null) {window.turnstile?.remove?.(wid); widgetIdRef.current = null;}
    };
  }, [enabled, siteKey]);

  return { turnstileRef, isReady: enabled && !!siteKey };
}

function findOrCreateScript(): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]");
  if (existing) {return existing;}
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileScript = "true";
  document.head.appendChild(script);
  return script;
}
