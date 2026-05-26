interface FormProps {
  className?: string
  buttonClassName?: string
}

interface ConnectFormProps extends FormProps {
  storeSlug: string
}

const defaultConnectButtonClassName = actionClassName({ size: "lg" })
const defaultDisconnectButtonClassName = actionClassName({ variant: "ghost", size: "sm", className: "min-h-11" })

function csrfToken() {
  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? ""
}

export function DiscogsConnectForm({
  storeSlug,
  className,
  buttonClassName = defaultConnectButtonClassName,
}: ConnectFormProps) {
  return (
    <form method="POST" action="/auth/discogs/shopper/authorize" className={className}>
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <input type="hidden" name="store_slug" value={storeSlug} />
      <button type="submit" className={buttonClassName}>
        Connect with Discogs
      </button>
    </form>
  )
}

export function DiscogsDisconnectForm({
  className,
  buttonClassName = defaultDisconnectButtonClassName,
}: FormProps) {
  return (
    <form method="POST" action="/auth/discogs/shopper/disconnect" className={className}>
      <input type="hidden" name="authenticity_token" value={csrfToken()} />
      <input type="hidden" name="_method" value="delete" />
      <button type="submit" className={buttonClassName}>
        Disconnect
      </button>
    </form>
  )
}
import { actionClassName } from "./ui/action"
