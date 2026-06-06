import { actionClassName } from "@/components/ui/action";
import Button from "@/components/ui/button";
import { csrfToken } from "@/lib/csrf_token";

import type { ClaimStore } from "./types";

export default function ClaimActions({ store }: { store: ClaimStore }) {
  return (
    <>
      <form action={`/${store.discogs_username}/authorize`} method="POST">
        <input type="hidden" name="authenticity_token" value={csrfToken()} />
        <Button type="submit" size="lg" className="w-full">Authorize with Discogs</Button>
      </form>
      <a href={store.storefront_path}
        className={actionClassName({ variant: "ghost", size: "md", className: "mt-2 w-full" })}>
        View current storefront
      </a>
      <p className="mt-4 text-center text-xs leading-relaxed text-mc-text-dim">
        Discogs confirms account ownership before Milkcrate changes your storefront sync.
      </p>
    </>
  );
}
