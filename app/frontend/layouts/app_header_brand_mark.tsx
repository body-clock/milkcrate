import { Link } from "@inertiajs/react";
import BrandMark from "@/components/brand_mark";

const linkClass =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg";

export function BrandMarkLink() {
  return (
    <Link href="/" className={linkClass}>
      <BrandMark size="small" />
    </Link>
  );
}
