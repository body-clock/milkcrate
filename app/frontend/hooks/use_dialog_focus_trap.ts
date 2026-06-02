import { useEffect, useRef } from "react";

interface UseDialogFocusTrapOptions {
  /** Ref to the element that should receive focus when the dialog closes. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

interface UseDialogFocusTrapResult {
  dialogRef: React.RefObject<HTMLDivElement | null>;
  titleRef: React.RefObject<HTMLSpanElement | null>;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

function focusFallback(
  focusable: HTMLElement[],
  titleEl: HTMLElement | null,
): void {
  titleEl?.focus();
}

function isWrappingBackward(
  event: KeyboardEvent,
  first: HTMLElement,
  titleEl: HTMLElement | null,
  dialog: HTMLElement,
): boolean {
  const active = document.activeElement;
  return (
    event.shiftKey &&
    (active === first || active === titleEl || !dialog.contains(active))
  );
}

function isWrappingForward(
  event: KeyboardEvent,
  last: HTMLElement,
  dialog: HTMLElement,
): boolean {
  const active = document.activeElement;
  return !event.shiftKey && (active === last || !dialog.contains(active));
}

function trapTabKey(
  event: KeyboardEvent,
  dialogEl: HTMLElement,
  titleEl: HTMLElement | null,
): void {
  event.preventDefault();
  const focusable = getFocusable(dialogEl);

  if (focusable.length === 0) {
    focusFallback(focusable, titleEl);
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (isWrappingBackward(event, first, titleEl, dialogEl)) {
    last.focus();
  } else if (isWrappingForward(event, last, dialogEl)) {
    first.focus();
  }
}

function onEscape(event: KeyboardEvent, callback: () => void): boolean {
  if (event.key === "Escape") {
    event.preventDefault();
    callback();
    return true;
  }
  return false;
}

function createTabHandler(
  onClose: () => void,
  dialogRef: React.RefObject<HTMLDivElement | null>,
  titleRef: React.RefObject<HTMLSpanElement | null>,
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (onEscape(event, onClose)) {return;}
    if (event.key !== "Tab") {return;}
    const dialog = dialogRef.current;
    const title = titleRef.current;
    if (!dialog) {return;}
    trapTabKey(event, dialog, title);
  };
}

function restoreFocus(
  previousFocus: HTMLElement | null,
  returnFocus: HTMLElement | null,
): void {
  if (previousFocus?.isConnected) {
    previousFocus.focus();
  } else if (returnFocus) {
    returnFocus.focus();
  }
}

/** Manages focus trapping inside a dialog. */
export function useDialogFocusTrap(
  open: boolean,
  onClose: () => void,
  { returnFocusRef: retRef }: UseDialogFocusTrapOptions = {},
): UseDialogFocusTrapResult {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) {return;}
    prevRef.current = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    const handler = createTabHandler(onClose, dialogRef, titleRef);
    document.addEventListener("keydown", handler);
    const savedPrev = prevRef.current;
    const savedReturn = retRef?.current ?? null;
    return () => { document.removeEventListener("keydown", handler); restoreFocus(savedPrev, savedReturn); };
  }, [open, onClose, retRef]);
  return { dialogRef, titleRef };
}
