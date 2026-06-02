import { router } from "@inertiajs/react"
import Button from "@/components/ui/button"
import BrandMark from "@/components/brand_mark"

export function TotpAlreadyEnabledBanner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm text-center">
        <BrandMark className="mb-2" />
        <h1 className="text-xl font-semibold text-mc-text">Already set up</h1>
        <p className="mt-2 text-sm text-mc-text-dim">
          Two-factor authentication is already active on this account.
        </p>
        <div className="mt-6">
          <Button onClick={() => router.get("/admin/totp")}>Enter authentication code</Button>
        </div>
      </div>
    </div>
  )
}
