import type { LoginPageProps } from "./types";
import LoginHeader from "./login_header";
import FlashMessages from "./flash_messages";
import LoginForm from "./login_form";
import DevLogin from "./dev_login";

export default function AdminLogin({ errors, notice, alert, allow_dev_login }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm">
        <LoginHeader />
        <FlashMessages notice={notice} alert={alert} />
        <LoginForm errors={errors} />
        {allow_dev_login && <DevLogin />}
      </div>
    </div>
  );
}
