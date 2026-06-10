import React from "react";

export default function ErrorAlert({ error }: { error: string }) {
  return (
    <section
      className="rounded-lg border border-mc-feedback-danger-border bg-mc-feedback-danger-bg p-6 text-center text-mc-feedback-danger"
      role="alert"
    >
      <p>{error}</p>
    </section>
  );
}
