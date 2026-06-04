import { csrfToken } from "@/lib/csrf_token";

import { actionClassName } from "./ui/action";

const defaultDisconnectButtonClassName = actionClassName({
  variant: "ghost",
  size: "sm",
  className: "min-h-11",
});

export function DiscogsDisconnectForm({
  className,
  buttonClassName = defaultDisconnectButtonClassName,
}: {
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <form method="POST" action="/auth/discogs/shopper/disconnect" className={className}>
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <input type="hidden" name="_method" value="delete" />
      <button type="submit" className={buttonClassName}>
        Disconnect
      </button>
    </form>
  );
}
