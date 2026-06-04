import { TotpAlreadyEnabledBanner } from "@/pages/admin/totp_already_enabled_banner";

import { TotpSetupContent } from "./totp_setup/totp_setup_content";

interface TotpSetupErrors {
  code?: string[];
}

export interface TotpSetupPageProps {
  qr_code: string;
  secret: string;
  already_enabled: boolean;
  errors?: TotpSetupErrors;
  notice?: string;
  alert?: string;
}

export default function AdminTotpSetup(props: TotpSetupPageProps) {
  if (props.already_enabled) {
    return <TotpAlreadyEnabledBanner />;
  }
  return (
    <TotpSetupContent
      qr_code={props.qr_code}
      secret={props.secret}
      errors={props.errors}
      notice={props.notice}
      alert={props.alert}
    />
  );
}
