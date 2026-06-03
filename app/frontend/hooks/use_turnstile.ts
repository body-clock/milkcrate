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

function renderTurnstileWidget(
  ref: HTMLDivElement,
  siteKey: string,
  onTokenRef: React.MutableRefObject<(token: string) => void>,
  widgetIdRef: React.MutableRefObject<TurnstileWidgetId | null>,
): void {
  if (!window.turnstile || widgetIdRef.current !== null) {
    return;
  }
  // eslint-disable-next-line eslint/no-param-reassign
  widgetIdRef.current = window.turnstile.render(ref, {
    sitekey: siteKey,
    callback: (token) => onTokenRef.current(token),
    "expired-callback": () => onTokenRef.current(""),
    "error-callback": () => onTokenRef.current(""),
  });
}

// eslint-disable-next-line max-lines-per-function
function setupTurnstile(
  siteKey: string,
  turnstileRef: React.RefObject<HTMLDivElement | null>,
  onTokenRef: React.MutableRefObject<(token: string) => void>,
  widgetIdRef: React.MutableRefObject<TurnstileWidgetId | null>,
): (() => void) | undefined {
  const ref = turnstileRef.current;
  if (!ref) {
    return undefined;
  }

  const script = findOrCreateScript();
  let scriptWithListener: HTMLScriptElement | null = null;

  const render = () => renderTurnstileWidget(ref, siteKey, onTokenRef, widgetIdRef);

  if (window.turnstile) {
    render();
  } else {
    scriptWithListener = script;
    script.addEventListener("load", render, { once: true });
  }

  return buildTurnstileCleanup(scriptWithListener, widgetIdRef, render);
}

function buildTurnstileCleanup(
  scriptWithListener: HTMLScriptElement | null,
  widgetIdRef: React.MutableRefObject<TurnstileWidgetId | null>,
  render: () => void,
): () => void {
  return () => {
    if (scriptWithListener) {
      scriptWithListener.removeEventListener("load", render);
    }
    const wid = widgetIdRef.current;
    if (wid !== null) {
      window.turnstile?.remove?.(wid);
      // eslint-disable-next-line eslint/no-param-reassign
      widgetIdRef.current = null;
    }
  };
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
    if (!enabled || !siteKey) {
      return;
    }
    return setupTurnstile(siteKey, turnstileRef, onTokenRef, widgetIdRef);
  }, [enabled, siteKey]);

  return { turnstileRef, isReady: enabled && !!siteKey };
}

function findOrCreateScript(): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]");
  if (existing) {
    return existing;
  }
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.defer = true;
  script.dataset.turnstileScript = "true";
  document.head.appendChild(script);
  return script;
}
