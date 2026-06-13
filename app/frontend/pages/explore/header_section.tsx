import React from "react";

export default function HeaderSection() {
  return (
    <section className="py-10 text-center sm:py-16">
      <h1 className="font-mc text-3xl leading-tight tracking-tight sm:text-4xl">
        Explore Record Stores
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm text-mc-text-dim sm:text-base">
        Discover independent record stores powered by MilkCrate. Browse their collections and find
        your next favorite crate.
      </p>
    </section>
  );
}
