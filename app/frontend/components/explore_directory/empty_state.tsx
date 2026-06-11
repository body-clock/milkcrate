import React from 'react';

export default function EmptyState() {
  return (
    <section className="rounded-lg border border-stone-200 p-8 text-center dark:border-stone-700">
      <p className="text-lg text-stone-500 dark:text-stone-400">
        No stores have joined yet. Check back soon!
      </p>
    </section>
  );
}
