import { motion } from "framer-motion";
import { Link } from "@inertiajs/react";
import { actionClassName } from "@/components/ui/action";

const fadeIn = { opacity: 0, y: 8 };
const fadeInAnim = { opacity: 1, y: 0 };
const delay1 = { delay: 0.1, duration: 0.3 };
const delay2 = { delay: 0.2, duration: 0.3 };
const delay3 = { delay: 0.3, duration: 0.3 };

export default function InvitationNoMatch() {
  return (
    <motion.div initial={fadeIn} animate={fadeInAnim} transition={{ duration: 0.3 }} className="w-full">
      <motion.h1
        initial={fadeIn}
        animate={fadeInAnim}
        transition={delay1}
        className="text-2xl font-bold text-mc-text mb-3"
      >
        This page is available
      </motion.h1>
      <motion.p
        initial={fadeIn}
        animate={fadeInAnim}
        transition={delay2}
        className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
      >
        If you sell records on Discogs, you can turn this URL into your own browsable storefront on
        Milkcrate.
      </motion.p>
      <motion.div initial={fadeIn} animate={fadeInAnim} transition={delay3}>
        <Link href="/apply" className={actionClassName({ size: "lg", className: "tracking-wide" })}>
          Apply to join
        </Link>
      </motion.div>
    </motion.div>
  );
}
