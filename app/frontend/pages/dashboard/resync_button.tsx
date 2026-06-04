import Button from "@/components/ui/button";

export default function ResyncButton({
  submitting,
  onResync,
}: {
  submitting: boolean;
  onResync: () => void;
}) {
  return (
    <div className="mt-6 pt-4 border-t border-mc-border">
      <Button onClick={onResync} busy={submitting}>
        {submitting ? "Syncing…" : "Re-sync inventory"}
      </Button>
    </div>
  );
}
