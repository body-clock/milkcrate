import React from "react";

export default function ErrorAlert({ error }: { error: string }) {
  return (
    <section
      className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950"
      role="alert"
    >
      <p className="text-red-700 dark:text-red-300">{error}</p>
    </section>
  );
}
