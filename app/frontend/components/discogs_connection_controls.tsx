import { csrfToken } from "@/lib/csrf_token";

import { actionClassName } from "./ui/action";

interface ConnectFormProps {
  className?: string;
  buttonClassName?: string;
  storeSlug: string;
  crateSlug?: string;
}

export { DiscogsDisconnectForm } from "./discogs_disconnect_form";

const defaultConnectButtonClassName = actionClassName({ size: "lg" });

export function DiscogsConnectForm({
  storeSlug,
  crateSlug,
  className,
  buttonClassName = defaultConnectButtonClassName,
}: ConnectFormProps) {
  return (
    <form method="POST" action="/auth/discogs/shopper/authorize" className={className}>
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <input type="hidden" name="store_slug" value={storeSlug} />
      {crateSlug && <input type="hidden" name="crate_slug" value={crateSlug} />}
      <button type="submit" className={buttonClassName}>
        Connect with Discogs
      </button>
    </form>
  );
}
