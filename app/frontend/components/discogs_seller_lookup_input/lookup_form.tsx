import Button from "@/components/ui/button";
import Field from "@/components/ui/field";
import SubmitContent from "./submit_content";
import type { Props } from "./types";

interface LookupFormProps {
  username: string;
  validationError: string | null;
  isSubmitting: boolean;
  copy: Props["copy"];
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (event: React.FormEvent) => void;
  handleUsernameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LookupForm({
  username,
  validationError,
  isSubmitting,
  copy,
  inputRef,
  handleSubmit,
  handleUsernameChange,
}: LookupFormProps) {
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
    >
      <Field
        id="seller-discogs-username"
        label={copy.seller_input_label}
        error={validationError ?? undefined}
        busy={isSubmitting}
        className="min-w-0 flex-1"
      >
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder={copy.seller_input_placeholder}
          className="min-h-11"
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
      <Button type="submit" busy={isSubmitting} size="lg" className="tracking-wide">
        <SubmitContent isSubmitting={isSubmitting} label={copy.seller_submit} />
      </Button>
    </form>
  );
}
