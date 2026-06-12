import Button from "@/components/ui/button";

export function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "primary" : "secondary"} size="sm" onClick={onClick}>
      {label} {count}
    </Button>
  );
}
