import Button from "@/components/ui/button";

import { EmailField } from "./login_fields";
import PasswordField from "./password_field";
import type { LoginPageProps } from "./types";
import { useLoginForm } from "./use_login_form";

export default function LoginForm({ errors }: LoginPageProps) {
  const { email, password, submitting, setEmail, setPassword, handleSubmit } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EmailField value={email} onChange={setEmail} error={errors?.email?.[0]} />
      <PasswordField value={password} onChange={setPassword} error={errors?.password?.[0]} />
      <Button type="submit" className="w-full" busy={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
