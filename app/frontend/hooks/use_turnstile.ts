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

function doRenderTurnstile(
  ref: HTMLDivElement,
  siteKey: string,
  onTokenRef: React.MutableRefObject<(token: string) => void>,
  currentWidgetId: TurnstileWidgetId | null,
): TurnstileWidgetId | null {
  if (!window.turnstile || currentWidgetId !== null) {
    return currentWidgetId;
  }
  return window.turnstile.render(ref, {
    sitekey: siteKey,
    callback: (token) => onTokenRef.current(token),
    "expired-callback": () => onTokenRef.current(""),
    "error-callback": () => onTokenRef.current(""),
  });
}

function attachWidgetRenderer(
  ref: HTMLDivElement,
  siteKey: string,
  onTokenRef: React.MutableRefObject<(token: string) => void>,
): { render: () => void; getWidgetId: () => TurnstileWidgetId | null } {
  let widgetId: TurnstileWidgetId | null = null;
  const render = () => {
    widgetId = doRenderTurnstile(ref, siteKey, onTokenRef, widgetId);
  };
  return { render, getWidgetId: () => widgetId };
}

function removeTurnstileWidget(
  scriptWithListener: HTMLScriptElement | null,
  render: () => void,
  getWidgetId: () => TurnstileWidgetId | null,
): () => void {
  return () => {
    if (scriptWithListener) {
      scriptWithListener.removeEventListener("load", render);
    }
    const wid = getWidgetId();
    if (wid !== null) {
      window.turnstile?.remove?.(wid);
    }
  };
}

function setupTurnstile(
  siteKey: string,
  turnstileRef: React.RefObject<HTMLDivElement | null>,
  onTokenRef: React.MutableRefObject<(token: string) => void>,
): (() => void) | undefined {
  const ref = turnstileRef.current;
  if (!ref) {
    return undefined;
  }
  const script = findOrCreateScript();
  const { render, getWidgetId } = attachWidgetRenderer(ref, siteKey, onTokenRef);
  let scriptWithListener: HTMLScriptElement | null = null;
  if (window.turnstile) {
    render();
  } else {
    scriptWithListener = script;
    script.addEventListener("load", render, { once: true });
  }
  return removeTurnstileWidget(scriptWithListener, render, getWidgetId);
}

export function useTurnstile({
  enabled,
  siteKey,
  onToken,
}: UseTurnstileOptions): UseTurnstileResult {
  const turnstileRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  useEffect(() => {
    if (!enabled || !siteKey) {
      return;
    }
    return setupTurnstile(siteKey, turnstileRef, onTokenRef);
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
