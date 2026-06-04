import { TotpChallengeHeader } from "@/pages/admin/totp_challenge_header";
import { TotpFlashMessages } from "@/pages/admin/totp_flash_messages";
import { TotpSetupForm } from "@/pages/admin/totp_setup_form";

import type { TotpSetupPageProps } from "../totp_setup";

export function TotpSetupContent({
  qr_code,
  secret,
  errors,
  notice,
  alert,
}: Omit<TotpSetupPageProps, "already_enabled">) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <TotpChallengeHeader
        title="Set up two-factor authentication"
        subtitle="Scan this QR code with your authenticator app"
      />
      <TotpFlashMessages notice={notice} alert={alert} />
      <TotpSetupForm qrCode={qr_code} secret={secret} error={errors?.code?.[0]} />
    </div>
  );
}
