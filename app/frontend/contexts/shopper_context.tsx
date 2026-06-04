import { usePage } from "@inertiajs/react";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface ShopperInfo {
  discogs_username: string;
}

export interface WantlistResult {
  wantlist_url: string | null;
  added: number;
  skipped: number;
}

type WantlistState = "idle" | "creating" | "success" | "error";

interface ShopperContextValue {
  shopper: ShopperInfo | null;
  isConnected: boolean;
  state: WantlistState;
  addToWantlist: (
    items: { discogs_listing_id: string }[],
    storeSlug: string,
  ) => Promise<WantlistResult | null>;
  wantlistResult: WantlistResult | null;
  errorMessage: string | null;
  resetResult: () => void;
}

const ShopperContext = createContext<ShopperContextValue | null>(null);

async function sendRequest(items: { discogs_listing_id: string }[], storeSlug: string) {
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;
  const response = await fetch("/pile/add_to_wantlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken ?? "" },
    body: JSON.stringify({ items, store_slug: storeSlug }),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error || "Failed to add to wantlist");
  }
  return response.json();
}

type WantlistStateObj = {
  state: WantlistState;
  wantlistResult: WantlistResult | null;
  errorMessage: string | null;
};

function wantlistInitState(): WantlistStateObj {
  return { state: "idle", wantlistResult: null, errorMessage: null };
}

type WantlistSetter = React.Dispatch<React.SetStateAction<WantlistStateObj>>;

async function executeAddToWantlist(
  items: { discogs_listing_id: string }[],
  storeSlug: string,
  setWantlist: WantlistSetter,
): Promise<WantlistResult | null> {
  setWantlist({ state: "creating", wantlistResult: null, errorMessage: null });
  try {
    const result = await sendRequest(items, storeSlug);
    setWantlist({ state: "success", wantlistResult: result, errorMessage: null });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    setWantlist({ state: "error", wantlistResult: null, errorMessage: message });
    return null;
  }
}

function useWantlistState(isConnected: boolean) {
  const [wantlist, setWantlist] = useState<WantlistStateObj>(wantlistInitState);

  const addToWantlist = useCallback(
    async (items: { discogs_listing_id: string }[], storeSlug: string) => {
      if (!isConnected) {
        return null;
      }
      return executeAddToWantlist(items, storeSlug, setWantlist);
    },
    [isConnected, setWantlist],
  );

  const resetResult = useCallback(() => {
    setWantlist(wantlistInitState());
  }, []);

  return { ...wantlist, addToWantlist, resetResult };
}

export function ShopperProvider({ children }: { children: React.ReactNode }) {
  const page = usePage<{ shopper?: ShopperInfo | null }>();
  const shopper = page.props.shopper ?? null;
  const isConnected = !!shopper;
  const wantlist = useWantlistState(isConnected);

  const value = useMemo<ShopperContextValue>(
    () => ({ shopper, isConnected, ...wantlist }),
    [shopper, isConnected, wantlist],
  );

  return <ShopperContext.Provider value={value}>{children}</ShopperContext.Provider>;
}

export function useShopperContext() {
  const context = useContext(ShopperContext);
  if (!context) {
    throw new Error("useShopperContext must be used within ShopperContext");
  }
  return context;
}
