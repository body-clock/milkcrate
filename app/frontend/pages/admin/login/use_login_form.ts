import { router } from "@inertiajs/react";
import { useState } from "react";

interface UseLoginFormResult {
  email: string;
  password: string;
  submitting: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function useLoginForm(): UseLoginFormResult {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    router.post(
      "/admin/login",
      { session: { email, password } },
      { onFinish: () => setSubmitting(false), preserveState: true },
    );
  };

  return { email, password, submitting, setEmail, setPassword, handleSubmit };
}
