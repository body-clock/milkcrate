import Button from "@/components/ui/button";

import SubmitContent from "./submit_content";
import type { Props } from "./types";
import UsernameField from "./username_field";

interface LookupFormProps {
  username: string;
  validationError: string | null;
  isSubmitting: boolean;
  copy: Props["copy"];
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (event: React.FormEvent) => void;
  handleUsernameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function LookupForm(props: LookupFormProps) {
  return (
    <form
      onSubmit={props.handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3"
    >
      <UsernameField
        inputRef={props.inputRef}
        username={props.username}
        handleUsernameChange={props.handleUsernameChange}
        copy={props.copy}
        validationError={props.validationError}
        isSubmitting={props.isSubmitting}
      />
      <Button type="submit" busy={props.isSubmitting} size="lg" className="tracking-wide">
        <SubmitContent isSubmitting={props.isSubmitting} label={props.copy.seller_submit} />
      </Button>
    </form>
  );
}
