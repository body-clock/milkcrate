import { Link } from "@inertiajs/react";

import { actionClassName } from "@/components/ui/action";

export default function ApplyLink({ slug }: { slug: string }) {
  const href = `/apply?discogs_username=${encodeURIComponent(slug)}`;
  return (
    <Link href={href} className={actionClassName({ size: "lg", className: "tracking-wide" })}>
      Claim this storefront
    </Link>
  );
}
