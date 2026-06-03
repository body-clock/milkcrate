import Button from "@/components/ui/button";

interface PileButtonProps {
  inPile: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function PileButton({ inPile, onAdd, onRemove }: PileButtonProps) {
  if (inPile) {
    return (
      <Button variant="secondary" onClick={onRemove}>
        ✓ In pile
      </Button>
    );
  }
  return <Button onClick={onAdd}>+ Pile</Button>;
}
