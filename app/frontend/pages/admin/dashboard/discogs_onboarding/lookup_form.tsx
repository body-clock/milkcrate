import Button from "@/components/ui/button";
import Field from "@/components/ui/field";

function usernameField(value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void) {
  return (
    <Field id="admin-discogs-username" label="Discogs username" className="min-w-0">
      <input
        type="text"
        name="discogs_username_lookup"
        value={value}
        onChange={onChange}
        placeholder="seller-name"
        autoComplete="off"
      />
    </Field>
  );
}

function submitButton(isBusy: boolean) {
  return (
    <div className="flex items-end">
      <Button type="submit" variant="secondary" className="w-full md:w-auto" busy={isBusy}>
        {isBusy ? "Checking..." : "Lookup"}
      </Button>
    </div>
  );
}

export function LookupForm({
  username,
  isBusy,
  onUsernameChange,
  onLookup,
}: {
  username: string;
  isBusy: boolean;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLookup: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={onLookup}>
      {usernameField(username, onUsernameChange)}
      {submitButton(isBusy)}
    </form>
  );
}
