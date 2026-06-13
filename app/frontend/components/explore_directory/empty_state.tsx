import React from "react";

export default function EmptyState({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-mc-border p-8 text-center">
      <p className="text-lg text-mc-text-dim">{message}</p>
    </section>
  );
}
