import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import { actionClassName } from "@/components/ui/action";

const anim = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };
const dur = { duration: 0.3 };
const d1 = { delay: 0.1, duration: 0.3 };
const d2 = { delay: 0.2, duration: 0.3 };
const d3 = { delay: 0.3, duration: 0.3 };

function renderHeading() {
  return (
    <motion.h1
      initial={anim}
      animate={visible}
      transition={d1}
      className="text-2xl font-bold text-mc-text mb-3"
    >
      This page is available
    </motion.h1>
  );
}

function renderMessage() {
  return (
    <motion.p
      initial={anim}
      animate={visible}
      transition={d2}
      className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
    >
      If you sell records on Discogs, you can turn this URL into your own browsable storefront on
      Milkcrate.
    </motion.p>
  );
}

function renderCta() {
  return (
    <motion.div initial={anim} animate={visible} transition={d3}>
      <Link href="/apply" className={actionClassName({ size: "lg", className: "tracking-wide" })}>
        Apply to join
      </Link>
    </motion.div>
  );
}

export default function NoMatchContent() {
  return (
    <motion.div initial={anim} animate={visible} transition={dur} className="w-full">
      {renderHeading()}
      {renderMessage()}
      {renderCta()}
    </motion.div>
  );
}
