import React, { createContext, useCallback, useContext, useState } from "react"
import { usePage } from "@inertiajs/react"

interface ShopperInfo {
  discogs_username: string
}

export interface WantlistResult {
  wantlist_url: string | null
  added: number
  skipped: number
}

interface ShopperContextValue {
  shopper: ShopperInfo | null
  isConnected: boolean
  state: "idle" | "creating" | "success" | "error"
  addToWantlist: (items: { discogs_listing_id: string }[], storeSlug: string) => Promise<WantlistResult | null>
  wantlistResult: WantlistResult | null
  errorMessage: string | null
  resetResult: () => void
}

const ShopperContext = createContext<ShopperContextValue | null>(null)

export function ShopperProvider({ children }: { children: React.ReactNode }) {
  const page = usePage<{ shopper?: ShopperInfo | null }>()
  const shopper = page.props.shopper ?? null
  const isConnected = !!shopper

  const [state, setState] = useState<"idle" | "creating" | "success" | "error">("idle")
  const [wantlistResult, setWantlistResult] = useState<WantlistResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const addToWantlist = useCallback(
    async (items: { discogs_listing_id: string }[], storeSlug: string) => {
      if (!isConnected) {return null}

      setState("creating")
      setWantlistResult(null)
      setErrorMessage(null)

      const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content

      try {
        const response = await fetch("/pile/add_to_wantlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken ?? "",
          },
          body: JSON.stringify({ items, store_slug: storeSlug }),
        })

        if (!response.ok) {
          const body = await response.json()
          throw new Error(body.error || "Failed to add to wantlist")
        }

        const result = await response.json()
        setWantlistResult(result)
        setState("success")
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred"
        setErrorMessage(message)
        setState("error")
        return null
      }
    },
    [isConnected]
  )

  const resetResult = useCallback(() => {
    setState("idle")
    setWantlistResult(null)
    setErrorMessage(null)
  }, [])

  return (
    <ShopperContext.Provider
      value={{
        shopper,
        isConnected,
        state,
        addToWantlist,
        wantlistResult,
        errorMessage,
        resetResult,
      }}
    >
      {children}
    </ShopperContext.Provider>
  )
}

export function useShopperContext() {
  const context = useContext(ShopperContext)
  if (!context) {throw new Error("useShopperContext must be used within ShopperContext")}
  return context
}
