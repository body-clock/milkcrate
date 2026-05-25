interface FormProps {
  className?: string
  buttonClassName?: string
}

interface ConnectFormProps extends FormProps {
  storeSlug: string
}

const defaultButtonClassName =
  "mc-btn inline-flex min-h-11 items-center justify-center px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"

function csrfToken() {
  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? ""
}

export function DiscogsConnectForm({
  storeSlug,
  className,
  buttonClassName = `${defaultButtonClassName} mc-btn-primary`,
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
  buttonClassName = defaultButtonClassName,
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
