import { DiscogsDisconnectForm } from "@/components/discogs_connection_controls";

interface AppFooterProps {
  shopper?: { discogs_username: string } | null;
}

export function AppFooter({ shopper }: AppFooterProps) {
  return (
    <footer className="flex flex-col items-center gap-3 px-4 py-4 border-t border-mc-border text-center">
      {shopper && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-mc-text-dim">
          <span>Connected to Discogs as @{shopper.discogs_username}</span>
          <DiscogsDisconnectForm />
        </div>
      )}
      <span className="text-[11px] text-mc-text-dim tracking-wide">
        Powered by <span className="font-medium">Milkcrate.</span>
      </span>
    </footer>
  );
}
