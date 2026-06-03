import CharacterSection from "@/components/home/character_section";
import HeroSection from "@/components/home/hero_section";
import PreviewSection from "@/components/home/preview_section";
import SellerSection from "@/components/home/seller_section";
import SignoffSection from "@/components/home/signoff_section";
import StepsSection from "@/components/home/steps_section";
import MarketingLayout from "@/layouts/marketing_layout";
import type { Crate, HomepagePreview } from "@/types/inertia";

import type { HomeCopy } from "./home";

const FEATURES = [
  { title: "The Wall", description: "Interesting finds from the whole collection." },
  {
    title: "Featured Crates",
    description: "Spotlight new arrivals, randomized sub-genres, and hidden gems.",
  },
  { title: "Genre Bins", description: "Records organized by genre, just like a real shop." },
  {
    title: "Start a Pile",
    description: "Collect records as you browse, then carry them over to Discogs.",
  },
];

interface Props {
  demoHref: string;
  wallCrate: Crate | undefined;
  steps: { number: number; title: string; description: string }[];
  copy: HomeCopy;
  preview: HomepagePreview;
}

export default function HomeSections({ demoHref, wallCrate, steps, copy, preview }: Props) {
  return (<MarketingLayout>
      <HeroSection
        headline={copy.headline} subhead={copy.subhead}
        ctaDemo={copy.cta_demo} demoHref={demoHref}
      />
      <PreviewSection
        previewLabel={copy.preview_label} previewBlurb={copy.preview_blurb}
        wallCrate={wallCrate} storeSlug={preview.store_slug}
      />
      <CharacterSection title={copy.store_character_title} features={FEATURES} />
      <SellerSection
        title={copy.seller_section_title} body={copy.seller_section_body}
        copy={copy} fallback={copy.seller_waitlist_fallback}
      />
      <StepsSection steps={steps} />
      <SignoffSection text={copy.bottom_signoff} />
    </MarketingLayout>);
}
