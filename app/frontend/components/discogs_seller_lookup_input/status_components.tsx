import { AnimatePresence } from "framer-motion";

import type { LookupState } from "@/hooks/use_discogs_lookup";

import { LookupActiveStore } from "./lookup_active_store";
import { LookupApiError } from "./lookup_api_error";
import { LookupApplicant } from "./lookup_applicant";
import { LookupLoading } from "./lookup_loading";
import { LookupNotFound } from "./lookup_not_found";
import { LookupPreview } from "./lookup_preview";
import type { Props } from "./types";

type LookupStatusProps = {
  state: LookupState;
  copy: Props["copy"];
  onRetry: () => void;
};

function renderLookupStatus(state: LookupState, copy: Props["copy"], onRetry: () => void) {
  switch (state.status) {
    case "loading":
      return <LookupLoading />;
    case "preview":
      return <LookupPreview result={state.result} copy={copy} />;
    case "error_not_found":
      return <LookupNotFound copy={copy} />;
    case "error_active_store":
      return <LookupActiveStore result={state.result} copy={copy} />;
    case "error_applicant":
      return <LookupApplicant copy={copy} />;
    case "error_api":
      return <LookupApiError copy={copy} onRetry={onRetry} />;
  }
}

export function LookupStatus({ state, copy, onRetry }: LookupStatusProps) {
  return (
    <AnimatePresence mode="wait">
      {renderLookupStatus(state, copy, onRetry)}
    </AnimatePresence>
  );
}
