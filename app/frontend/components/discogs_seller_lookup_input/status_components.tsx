import { AnimatePresence } from "framer-motion";

import type { LookupState } from "@/hooks/use_discogs_lookup";

import { LookupActiveStore } from "./lookup_active_store";
import { LookupApiError } from "./lookup_api_error";
import { LookupApplicant } from "./lookup_applicant";
import { LookupLoading } from "./lookup_loading";
import { LookupNotFound } from "./lookup_not_found";
import { LookupPreview } from "./lookup_preview";
import type { Props } from "./types";

// eslint-disable-next-line eslint/max-lines-per-function
export function LookupStatus({
  state,
  copy,
  onRetry,
}: {
  state: LookupState;
  copy: Props["copy"];
  onRetry: () => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {state.status === "loading" && <LookupLoading />}
      {state.status === "preview" && <LookupPreview result={state.result} copy={copy} />}
      {state.status === "error_not_found" && <LookupNotFound copy={copy} />}
      {state.status === "error_active_store" && (
        <LookupActiveStore result={state.result} copy={copy} />
      )}
      {state.status === "error_applicant" && <LookupApplicant copy={copy} />}
      {state.status === "error_api" && <LookupApiError copy={copy} onRetry={onRetry} />}
    </AnimatePresence>
  );
}
