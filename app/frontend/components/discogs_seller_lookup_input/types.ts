import type { ComponentProps, ReactNode } from "react";

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

// Shared transition constant used by status components
export const easeOut: readonly [number, number, number, number] = [0.25, 0.46, 0.45, 0.94] as const;
export const MIN_USERNAME_LENGTH = 3;
