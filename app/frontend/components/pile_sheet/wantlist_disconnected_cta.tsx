import { DiscogsConnectForm } from "../discogs_connection_controls";
import { actionClassName } from "../ui/action";

export function DisconnectedCta(props: {
  storeName: string | null;
  storeSlug: string;
}) {
  const crateSlug =
    typeof window === "undefined"
      ? undefined
      : (window.history.state as { crateSlug?: string } | null)?.crateSlug;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Connect with Discogs to send these releases to your Wantlist and shop from{" "}
        {props.storeName ?? "this store"}.
      </p>
      <DiscogsConnectForm
        storeSlug={props.storeSlug}
        crateSlug={crateSlug}
        buttonClassName={actionClassName({ variant: "danger", size: "lg", className: "w-full" })}
      />
    </div>
  );
}
