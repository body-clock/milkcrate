export interface Props {
  copy: {
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
  };
}

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;

// Shared transition constant used by status components
export const easeOut: readonly [number, number, number, number] = [
  EASE_X1,
  EASE_Y1,
  EASE_X2,
  EASE_Y2,
] as const;
export const MIN_USERNAME_LENGTH = 3;
