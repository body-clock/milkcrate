import React, { createContext, useCallback, useContext, useState } from "react"
import { usePage } from "@inertiajs/react"

interface ShopperInfo {
  discogs_username: string
}

interface ShopperContextValue {
  shopper: ShopperInfo | null
  isConnected: boolean
  state: "idle" | "creating" | "success" | "error"
  createListFromPile: (storeSlug: string, items: { discogs_listing_id: string }[]) => Promise<{ list_url: string; added: number; skipped: number } | null>
  listResult: { list_url: string; added: number; skipped: number } | null
  errorMessage: string | null
  resetListResult: () => void
}

const ShopperContext = createContext<ShopperContextValue | null>(null)

export function ShopperProvider({ children }: { children: React.ReactNode }) {
  const page = usePage<{ shopper?: ShopperInfo | null }>()
  const shopper = page.props.shopper ?? null
  const isConnected = !!shopper

  const [state, setState] = useState<"idle" | "creating" | "success" | "error">("idle")
  const [listResult, setListResult] = useState<{ list_url: string; added: number; skipped: number } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content

  const createListFromPile = useCallback(
    async (storeSlug: string, items: { discogs_listing_id: string }[]) => {
      if (!isConnected) return null

      setState("creating")
      setListResult(null)
      setErrorMessage(null)

      try {
        const response = await fetch("/pile/create_list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken ?? "",
          },
          body: JSON.stringify({ store_slug: storeSlug, items }),
        })

        if (!response.ok) {
          const body = await response.json()
          throw new Error(body.error || "Failed to create list")
        }

        const result = await response.json()
        setListResult(result)
        setState("success")
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred"
        setErrorMessage(message)
        setState("error")
        return null
      }
    },
    [isConnected, csrfToken]
  )

  const resetListResult = useCallback(() => {
    setState("idle")
    setListResult(null)
    setErrorMessage(null)
  }, [])

  return (
    <ShopperContext.Provider
      value={{
        shopper,
        isConnected,
        state,
        createListFromPile,
        listResult,
        errorMessage,
        resetListResult,
      }}
    >
      {children}
    </ShopperContext.Provider>
  )
}

export function useShopperContext() {
  const context = useContext(ShopperContext)
  if (!context) throw new Error("useShopperContext must be used within ShopperProvider")
  return context
}
