import { useState, useCallback, useRef } from "react";
import { usePage } from "@inertiajs/react";
import { useTheme } from "@/hooks/use_theme";
import { useViewport } from "@/hooks/use_viewport";
import { usePileContext } from "@/contexts/pile_context";
import { AppContent } from "./app_content";
import type { Store } from "@/types/inertia";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface AppLayoutState {
  storeName?: string; discogsUsername?: string;
  theme: "light" | "dark"; toggle: () => void;
  isCompact: boolean; pile: { length: number };
  shopper?: { discogs_username: string } | null;
  pileOpen: boolean; setPileOpen: (open: boolean) => void;
  handleClosePile: () => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
  autoOpenPile: boolean;
  flashMsg: string | undefined; hasNotice: boolean;
}

function useAppLayoutState(): AppLayoutState {
  const page = usePage<{
    notice?: string; alert?: string;
    store?: Pick<Store, "name" | "discogs_username">;
    shopper?: { discogs_username: string } | null;
  }>();
  const { notice, alert: alertMsg, store, shopper } = page.props;
  const storeName = store?.name;
  const discogsUsername = store?.discogs_username;
  const { theme, toggle } = useTheme();
  const { isCompact } = useViewport();
  const { pile } = usePileContext();
  const autoOpenPile = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("open_pile");
  const [pileOpen, setPileOpen] = useState(autoOpenPile);
  const handleClosePile = useCallback(() => setPileOpen(false), []);
  const contextFocusRef = useRef<HTMLElement>(null);
  return { storeName, discogsUsername, theme, toggle, isCompact, pile, shopper,
    pileOpen, setPileOpen, handleClosePile, contextFocusRef, autoOpenPile,
    flashMsg: notice || alertMsg, hasNotice: !!notice };
}

export function AppLayoutContent({ children }: AppLayoutProps) {
  const state = useAppLayoutState();
  return <AppContent {...state}>{children}</AppContent>;
}
