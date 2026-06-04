import React from "react";

import { usePileContext } from "../../contexts/pile_context";
import type { Listing } from "../../types/inertia";

export function PilePopulator({
  children,
  pileRecords,
}: {
  children: React.ReactNode;
  pileRecords: Listing[];
}) {
  const { addToPile } = usePileContext();
  React.useEffect(() => {
    pileRecords.forEach((r) => addToPile(r));
  }, [addToPile, pileRecords]);
  return <>{children}</>;
}
