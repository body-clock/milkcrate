import { router } from "@inertiajs/react";

export function TotpLogoutLink() {
  return (
    <div className="text-center">
      <a
        href="/admin/logout"
        className="text-xs text-mc-text-dim hover:text-mc-text underline"
        onClick={(e) => {
          e.preventDefault();
          router.delete("/admin/logout");
        }}
      >
        Sign out and try a different account
      </a>
    </div>
  );
}
