import Button from "@/components/ui/button";
import { useLoginForm } from "./use_login_form";
import { EmailField } from "./login_fields";
import PasswordField from "./password_field";
import type { LoginPageProps } from "./types";

export default function LoginForm({ errors: _errors }: LoginPageProps) {
  const { email, password, submitting, setEmail, setPassword, handleSubmit } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EmailField value={email} onChange={setEmail} />
      <PasswordField value={password} onChange={setPassword} />
      <Button type="submit" className="w-full" busy={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
