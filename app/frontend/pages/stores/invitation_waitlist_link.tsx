import { Link } from "@inertiajs/react";

export default function WaitlistLink({ slug }: { slug: string }) {
  const href = `/apply?discogs_username=${encodeURIComponent(slug)}`;
  return (
    <div>
      <Link href={href} className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors">
        Or apply via waitlist
      </Link>
    </div>
  );
}
