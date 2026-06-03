import Spinner from "@/components/spinner";
import Button from "@/components/ui/button";

import type { Copy } from "./types";

type SubmitButtonProps = {
  processing: boolean;
  copy: Copy;
};

export default function SubmitButton({ processing, copy }: SubmitButtonProps) {
  return (
    <Button type="submit" busy={processing} size="lg" className="tracking-wide">
      {processing ? <Spinner size="sm" /> : null}
      <span>{processing ? copy.submitting : copy.submit}</span>
    </Button>
  );
}
