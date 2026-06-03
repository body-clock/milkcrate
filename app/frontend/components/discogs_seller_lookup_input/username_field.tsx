import Field from "@/components/ui/field";
import type { Props } from "./types";

interface UsernameFieldProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  username: string;
  handleUsernameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  copy: Props["copy"];
  validationError: string | null;
  isSubmitting: boolean;
}

export default function UsernameField({
  inputRef, username, handleUsernameChange, copy, validationError, isSubmitting,
}: UsernameFieldProps) {
  return (
    <Field id="seller-discogs-username" label={copy.seller_input_label}
      error={validationError ?? undefined} busy={isSubmitting} className="min-w-0 flex-1">
      <input ref={inputRef} type="text" value={username}
        onChange={handleUsernameChange} placeholder={copy.seller_input_placeholder}
        className="min-h-11" autoComplete="off" spellCheck={false} />
    </Field>
  );
}
