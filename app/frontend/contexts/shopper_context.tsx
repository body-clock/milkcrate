import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { usePage } from "@inertiajs/react"

interface ShopperInfo { discogs_username: string }

export interface WantlistResult {
  wantlist_url: string | null
  added: number
  skipped: number
}

type WantlistState = "idle" | "creating" | "success" | "error"

interface ShopperContextValue {
  shopper: ShopperInfo | null
  isConnected: boolean
  state: WantlistState
  addToWantlist: (items: { discogs_listing_id: string }[], storeSlug: string) => Promise<WantlistResult | null>
  wantlistResult: WantlistResult | null
  errorMessage: string | null
  resetResult: () => void
}

const ShopperContext = createContext<ShopperContextValue | null>(null)

async function sendRequest(items: { discogs_listing_id: string }[], storeSlug: string) {
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
  const response = await fetch("/pile/add_to_wantlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken ?? "" },
    body: JSON.stringify({ items, store_slug: storeSlug }),
  })
  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.error || "Failed to add to wantlist")
  }
  return response.json()
}

function useWantlistState(isConnected: boolean) {
  const [state, setState] = useState<WantlistState>("idle")
  const [wantlistResult, setWantlistResult] = useState<WantlistResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const addToWantlist = useCallback(
    async (items: { discogs_listing_id: string }[], storeSlug: string) => {
      if (!isConnected) {return null}
      setState("creating")
      setWantlistResult(null)
      setErrorMessage(null)
      try {
        const result = await sendRequest(items, storeSlug)
        setWantlistResult(result)
        setState("success")
        return result
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred")
        setState("error")
        return null
      }
    },
    [isConnected],
  )

  const resetResult = useCallback(() => {
    setState("idle")
    setWantlistResult(null)
    setErrorMessage(null)
  }, [])

  return { state, wantlistResult, errorMessage, addToWantlist, resetResult }
}

export function ShopperProvider({ children }: { children: React.ReactNode }) {
  const page = usePage<{ shopper?: ShopperInfo | null }>()
  const shopper = page.props.shopper ?? null
  const isConnected = !!shopper
  const wantlist = useWantlistState(isConnected)

  const value = useMemo<ShopperContextValue>(
    () => ({ shopper, isConnected, ...wantlist }),
    [shopper, isConnected, wantlist],
  )

  return <ShopperContext.Provider value={value}>{children}</ShopperContext.Provider>
}

export function useShopperContext() {
  const context = useContext(ShopperContext)
  if (!context) {throw new Error("useShopperContext must be used within ShopperContext")}
  return context
}
