import type { HomepagePreview } from "@/types/inertia";
import MarketingLayout from "@/layouts/marketing_layout";
import HeroSection from "@/components/home/hero_section";
import PreviewSection from "@/components/home/preview_section";
import CharacterSection from "@/components/home/character_section";
import SellerSection from "@/components/home/seller_section";
import StepsSection from "@/components/home/steps_section";
import SignoffSection from "@/components/home/signoff_section";

interface Props {
  copy: {
    headline: string;
    subhead: string;
    cta_demo: string;
    hero_subhead: string;
    steps: {
      step1_title: string;
      step1_body: string;
      step2_title: string;
      step2_body: string;
      step3_title: string;
      step3_body: string;
    };
    preview_blurb: string;
    preview_label: string;
    store_character_title: string;
    seller_section_title: string;
    seller_section_body: string;
    seller_input_label: string;
    seller_input_placeholder: string;
    seller_submit: string;
    seller_preview_claim: string;
    seller_not_found: string;
    seller_already_active: string;
    seller_applicant_exists: string;
    seller_waitlist_fallback: string;
    seller_min_listings: string;
    seller_lookup_error: string;
    bottom_signoff: string;
  };
  preview: HomepagePreview;
}

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

function useDemoHref(preview: HomepagePreview): string {
  return preview.sections.length > 0 && preview.store_slug
    ? `/${preview.store_slug}`
    : "/philadelphiamusic";
}

function useWallCrate(preview: HomepagePreview) {
  const section = preview.sections.find((s) => s.key === "wall");
  return section?.key === "wall" ? section.crate : undefined;
}

function buildSteps(
  copy: Props["copy"],
): { number: number; title: string; description: string }[] {
  return [
    { number: 1, title: copy.steps.step1_title, description: copy.steps.step1_body },
    { number: 2, title: copy.steps.step2_title, description: copy.steps.step2_body },
    { number: 3, title: copy.steps.step3_title, description: copy.steps.step3_body },
  ];
}

export default function Home({ copy, preview }: Props) {
  const demoHref = useDemoHref(preview);
  const wallCrate = useWallCrate(preview);
  const steps = buildSteps(copy);

  return (
    <MarketingLayout>
      <HeroSection headline={copy.headline} subhead={copy.subhead} ctaDemo={copy.cta_demo} demoHref={demoHref} />
      <PreviewSection previewLabel={copy.preview_label} previewBlurb={copy.preview_blurb} wallCrate={wallCrate} storeSlug={preview.store_slug} />
      <CharacterSection title={copy.store_character_title} features={FEATURES} />
      <SellerSection title={copy.seller_section_title} body={copy.seller_section_body} copy={copy} fallback={copy.seller_waitlist_fallback} />
      <StepsSection steps={steps} />
      <SignoffSection text={copy.bottom_signoff} />
    </MarketingLayout>
  );
}
