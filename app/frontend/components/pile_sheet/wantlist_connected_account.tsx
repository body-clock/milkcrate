import { DiscogsDisconnectForm } from "../discogs_connection_controls";

export function ConnectedAccount({ username }: { username: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-mc-text-dim">
      <span>Connected to Discogs as @{username}</span>
      <DiscogsDisconnectForm />
    </div>
  );
}
