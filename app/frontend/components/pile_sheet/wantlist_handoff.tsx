import { useState, useEffect } from "react";
import Button from "../ui/button";
import { DiscogsConnectForm, DiscogsDisconnectForm } from "../discogs_connection_controls";
import { actionClassName } from "../ui/action";

export function WantlistHandoffAction({
  storeName,
  onSend,
  highlight,
}: {
  storeName: string | null;
  onSend: () => void;
  highlight?: boolean;
}) {
  const [pulsing, setPulsing] = useState(highlight);

  useEffect(() => {
    if (!pulsing) {return;}
    const timer = setTimeout(() => setPulsing(false), 2500);
    return () => clearTimeout(timer);
  }, [pulsing]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Get these records from {storeName ?? "this store"} on Discogs.
      </p>
      <Button
        onClick={onSend}
        size="lg"
        variant="success"
        className={
          pulsing
            ? "animate-pulse transition-all duration-500"
            : "transition-all duration-500 opacity-100"
        }
      >
        Send to Discogs Wantlist
      </Button>
    </div>
  );
}

export function DisconnectedCta({
  storeName,
  storeSlug,
}: {
  storeName: string | null;
  storeSlug: string;
}) {
  const crateSlug =
    typeof window !== "undefined"
      ? (window.history.state as { crateSlug?: string } | null)?.crateSlug
      : undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Connect with Discogs to send these releases to your Wantlist and shop from{" "}
        {storeName ?? "this store"}.
      </p>
      <DiscogsConnectForm
        storeSlug={storeSlug}
        crateSlug={crateSlug}
        buttonClassName={actionClassName({ variant: "danger", size: "lg", className: "w-full" })}
      />
    </div>
  );
}

export function ConnectedAccount({ username }: { username: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-mc-text-dim">
      <span>Connected to Discogs as @{username}</span>
      <DiscogsDisconnectForm />
    </div>
  );
}
