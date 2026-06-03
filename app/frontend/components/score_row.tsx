export function ScoreRow({ id, label, value }: { id: string; label: string; value: number }) {
  return (
    <>
      <span key={`l-${id}`} className="truncate tabular-nums text-mc-text-dim/80">
        {label}
      </span>
      <span
        key={`v-${id}`}
        className={`text-right tabular-nums ${value >= 0 ? "text-mc-feedback-success" : "text-mc-feedback-danger"}`}
      >
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)}
      </span>
    </>
  );
}
