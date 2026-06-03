export function TotpManualEntry({ secret }: { secret: string }) {
  return (
    <div className="mb-6 text-center">
      <p className="text-xs text-mc-text-dim">Can&apos;t scan the code? Manually enter this key:</p>
      <code className="mt-1 block rounded bg-mc-bg-card px-3 py-2 text-xs font-mono tracking-wider text-mc-text select-all">
        {secret.match(/.{1,4}/g)?.join(" ") ?? secret}
      </code>
    </div>
  );
}
