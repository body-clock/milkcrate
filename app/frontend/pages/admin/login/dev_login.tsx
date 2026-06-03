import { router } from "@inertiajs/react";

import Button from "@/components/ui/button";

export default function DevLogin() {
  return (
    <div className="mt-8 border-t border-mc-border pt-6 text-center">
      <p className="mb-3 text-xs text-mc-text-dim">Development environment</p>
      <Button variant="secondary" onClick={() => router.get("/dev/admin-login")}>
        Dev sign-in
      </Button>
    </div>
  );
}
