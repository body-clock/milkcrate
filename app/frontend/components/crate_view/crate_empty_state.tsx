interface CrateEmptyStateProps {
  header: React.ReactNode;
}

export default function CrateEmptyState({ header }: CrateEmptyStateProps) {
  return (
    <div>
      {header}
      <div className="py-16 text-center text-mc-text-dim text-sm">
        No records in this crate yet.
      </div>
    </div>
  );
}
