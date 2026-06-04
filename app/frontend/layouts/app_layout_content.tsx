import { usePage } from "@inertiajs/react";
import { useState, useCallback, useRef } from "react";

import { usePileContext } from "@/contexts/pile_context";
import { useTheme } from "@/hooks/use_theme";
import { useViewport } from "@/hooks/use_viewport";
import type { Store } from "@/types/inertia";

import { AppContent } from "./app_content";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface AppLayoutState {
  storeName?: string;
  discogsUsername?: string;
  theme: "light" | "dark";
  toggle: () => void;
  isCompact: boolean;
  pile: { length: number };
  shopper?: { discogs_username: string } | null;
  pileOpen: boolean;
  setPileOpen: (open: boolean) => void;
  handleClosePile: () => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
  autoOpenPile: boolean;
  flashMsg: string | undefined;
  hasNotice: boolean;
}

type AppPageProps = {
  notice?: string;
  alert?: string;
  store?: Pick<Store, "name" | "discogs_username">;
  shopper?: { discogs_username: string } | null;
};

function autoOpenPileFromUrl(): boolean {
  return (
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("open_pile")
  );
}

function usePileState() {
  const initial = autoOpenPileFromUrl();
  const [pileOpen, setPileOpen] = useState(initial);
  const handleClosePile = useCallback(() => setPileOpen(false), []);
  return { pileOpen, setPileOpen, handleClosePile, autoOpenPile: initial };
}

function useAppLayoutState(): AppLayoutState {
  const page = usePage<AppPageProps>();
  const { notice, alert: alertMsg, store, shopper } = page.props;
  const { theme, toggle } = useTheme();
  const { isCompact } = useViewport();
  const { pile } = usePileContext();
  const pileState = usePileState();
  const contextFocusRef = useRef<HTMLElement>(null);
  return { storeName: store?.name, discogsUsername: store?.discogs_username,
    theme, toggle, isCompact, pile, shopper, ...pileState, contextFocusRef,
    flashMsg: notice || alertMsg, hasNotice: !!notice };
}

export function AppLayoutContent({ children }: AppLayoutProps) {
  const state = useAppLayoutState();
  return <AppContent {...state}>{children}</AppContent>;
}
