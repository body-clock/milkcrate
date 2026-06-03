import React from "react";

import { TotpAlreadyEnabledBanner } from "@/pages/admin/totp_already_enabled_banner";
import { TotpChallengeHeader } from "@/pages/admin/totp_challenge_header";
import { TotpFlashMessages } from "@/pages/admin/totp_flash_messages";
import { TotpSetupForm } from "@/pages/admin/totp_setup_form";

interface TotpSetupErrors {
  code?: string[];
}

interface TotpSetupPageProps {
  qr_code: string;
  secret: string;
  already_enabled: boolean;
  errors?: TotpSetupErrors;
  notice?: string;
  alert?: string;
}

// eslint-disable-next-line max-lines-per-function
export default function AdminTotpSetup({
  qr_code,
  secret,
  already_enabled,
  errors,
  notice,
  alert,
}: TotpSetupPageProps) {
  if (already_enabled) {
    return <TotpAlreadyEnabledBanner />;
  }

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
