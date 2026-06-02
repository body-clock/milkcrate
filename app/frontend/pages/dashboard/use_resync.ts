import { router } from "@inertiajs/react";

export function handleResync(setSubmitting: (v: boolean) => void) {
  setSubmitting(true);
  router.post("/dashboard/resync", {}, {
    onFinish: () => setSubmitting(false),
    onError: () => alert("Failed to queue sync. Please try again."),
    onNetworkError: () => alert("Network error. Please check your connection."),
  });
}
