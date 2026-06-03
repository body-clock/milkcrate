import Field from "@/components/ui/field";

import type { Copy, FormData } from "./types";

const INVENTORY_OPTIONS = [
  ["", "Select one"],
  ["under_500", "Under 500 records"],
  ["500_2000", "500 – 2,000 records"],
  ["2000_10000", "2,000 – 10,000 records"],
  ["over_10000", "Over 10,000 records"],
] as const;

type InventoryFieldProps = {
  data: FormData;
  setData: (name: string, value: string) => void;
  copy: Copy;
};

export default function InventoryField({ data, setData, copy }: InventoryFieldProps) {
  return (
    <Field id="apply-inventory_size" label={copy.fields.inventory_size} hint="Optional">
      <select
        value={data.inventory_size}
        onChange={(e) => setData("inventory_size", e.target.value)}
      >
        {INVENTORY_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </Field>
  );
}
