import { useEffect, useRef } from "react";

type TurnstileWidgetId = string | number;

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => TurnstileWidgetId;
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

/**
 * Manages Cloudflare Turnstile widget lifecycle: script injection,
 * widget render, token callbacks, and cleanup.
 */
export function useTurnstile({
  enabled,
  siteKey,
  onToken,
}: UseTurnstileOptions): UseTurnstileResult {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null);

  useEffect(() => {
    if (!enabled || !siteKey || !turnstileRef.current) return;

    const renderWidget = () => {
      if (!window.turnstile || !turnstileRef.current || widgetIdRef.current !== null) return;

      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-turnstile-script]",
    );
    if (existingScript) {
      if (window.turnstile) {
        renderWidget();
      } else {
        existingScript.addEventListener("load", renderWidget, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      existingScript?.removeEventListener("load", renderWidget);
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove?.(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [enabled, siteKey, onToken]);

  return { turnstileRef, isReady: enabled && !!siteKey };
}
