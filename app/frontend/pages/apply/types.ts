export type Copy = {
  headline: string;
  subhead: string;
  submit: string;
  submitting: string;
  confirmation_headline: string;
  confirmation_body: string;
  context_title: string;
  context_discogs_why: string;
  context_what_happens: string;
  context_no_commitment: string;
  field_hint_discogs: string;
  field_hint_email: string;
  fields: {
    name: string;
    discogs_username: string;
    email: string;
    inventory_size: string;
    notes: string;
  };
};

export type TurnstileConfig = {
  enabled: boolean;
  site_key: string | null;
};

export type FormData = {
  name: string;
  discogs_username: string;
  email: string;
  inventory_size: string;
  notes: string;
  turnstile_token: string;
};

export type ErrorEntry = [string, { error: string; value: string }[]];
