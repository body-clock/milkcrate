interface RowProps {
  dt: string;
  children: React.ReactNode;
}

export default function Row({ dt, children }: RowProps) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mc-text-dim shrink-0">{dt}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
