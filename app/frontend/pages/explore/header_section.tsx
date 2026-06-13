import React from "react";

import type { ExploreCopy } from "@/pages/explore";

export default function HeaderSection({ copy }: { copy: ExploreCopy }) {
  return (
    <section className="py-10 text-center sm:py-16">
      <h1 className="font-mc text-3xl leading-tight tracking-tight sm:text-4xl">{copy.headline}</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm text-mc-text-dim sm:text-base">{copy.subhead}</p>
    </section>
  );
}
