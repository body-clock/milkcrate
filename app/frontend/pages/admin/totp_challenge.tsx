import React from "react";

import { TotpChallengeForm } from "@/pages/admin/totp_challenge_form";
import { TotpChallengeHeader } from "@/pages/admin/totp_challenge_header";
import { TotpFlashMessages } from "@/pages/admin/totp_flash_messages";

interface TotpChallengeErrors {
  code?: string[];
}

interface TotpChallengePageProps {
  errors?: TotpChallengeErrors;
  notice?: string;
  alert?: string;
}

export default function AdminTotpChallenge({ errors, notice, alert }: TotpChallengePageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-mc-bg px-4">
      <div className="w-full max-w-sm">
        <TotpChallengeHeader
          title="Two-factor authentication"
          subtitle="Enter the code from your authenticator app"
        />
        <TotpFlashMessages notice={notice} alert={alert} />
        <TotpChallengeForm error={errors?.code?.[0]} />
      </div>
    </div>
  );
}
