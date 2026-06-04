export function ScoreTotalRow({ total }: { total: number }) {
  return (
    <div className="mt-0.5 flex justify-between border-t border-mc-border/20 pt-0.5 text-mc-text font-semibold tabular-nums">
      <span>Total</span>
      <span className={total >= 0 ? "text-mc-feedback-success" : "text-mc-feedback-danger"}>
        {total >= 0 ? "+" : ""}
        {total.toFixed(1)}
      </span>
    </div>
  );
}
