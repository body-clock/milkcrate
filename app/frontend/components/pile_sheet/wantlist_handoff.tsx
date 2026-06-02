import { useState, useEffect } from "react";
import Button from "../ui/button";

const PULSE_DURATION_MS = 2500;

function usePulse(initial: boolean | undefined): boolean {
  const [pulsing, setPulsing] = useState(initial);
  useEffect(() => {
    if (!pulsing) {return;}
    const timer = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [pulsing]);
  return pulsing ?? false;
}

export function WantlistHandoffAction(props: {
  storeName: string | null;
  onSend: () => void;
  highlight?: boolean;
}) {
  const pulsing = usePulse(props.highlight);
  const btnClass = pulsing
    ? "animate-pulse transition-all duration-500"
    : "transition-all duration-500 opacity-100";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-mc-text-dim leading-relaxed">
        Get these records from {props.storeName ?? "this store"} on Discogs.
      </p>
      <Button onClick={props.onSend} size="lg" variant="success" className={btnClass}>
        Send to Discogs Wantlist
      </Button>
    </div>
  );
}
