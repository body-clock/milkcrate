import type { HomepagePreview } from "@/types/inertia";

import HomeSections from "./home_sections";

export interface HomeCopy {
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
}

export interface HomeProps {
  copy: HomeCopy;
  preview: HomepagePreview;
}

function useDemoHref(preview: HomepagePreview): string {
  return preview.sections.length > 0 && preview.store_slug
    ? `/${preview.store_slug}`
    : "/philadelphiamusic";
}

function useWallCrate(preview: HomepagePreview) {
  const section = preview.sections.find((s) => s.key === "wall");
  return section?.key === "wall" ? section.crate : undefined;
}

function buildSteps(copy: HomeCopy): { number: number; title: string; description: string }[] {
  return [
    { number: 1, title: copy.steps.step1_title, description: copy.steps.step1_body },
    { number: 2, title: copy.steps.step2_title, description: copy.steps.step2_body },
    { number: 3, title: copy.steps.step3_title, description: copy.steps.step3_body },
  ];
}

export default function Home({ copy, preview }: HomeProps) {
  const demoHref = useDemoHref(preview);
  const wallCrate = useWallCrate(preview);
  const steps = buildSteps(copy);

  return (
    <HomeSections
      demoHref={demoHref}
      wallCrate={wallCrate}
      steps={steps}
      copy={copy}
      preview={preview}
    />
  );
}
