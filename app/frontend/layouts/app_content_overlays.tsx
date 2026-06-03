import PileSheet from "@/components/pile_sheet";
import PileToast from "@/components/pile_toast";

interface AppContentOverlaysProps {
  pileOpen: boolean;
  handleClosePile: () => void;
  contextFocusRef: React.RefObject<HTMLElement | null>;
  autoOpenPile: boolean;
}

export function AppContentOverlays({
  pileOpen,
  handleClosePile,
  contextFocusRef,
  autoOpenPile,
}: AppContentOverlaysProps) {
  return (
    <>
      <PileToast />
      <PileSheet
        open={pileOpen}
        onClose={handleClosePile}
        returnFocusRef={contextFocusRef}
        highlightOnMount={autoOpenPile}
      />
    </>
  );
}
