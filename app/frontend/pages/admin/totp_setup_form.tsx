import Button from "@/components/ui/button";
import { TotpCodeInput, TOTP_CODE_LENGTH } from "@/pages/admin/totp_code_input";
import { TotpManualEntry } from "@/pages/admin/totp_manual_entry";
import { TotpQrSection } from "@/pages/admin/totp_qr_section";
import { SetupInstructions } from "@/pages/admin/totp_setup/setup_instructions";
import { useTotpSubmit } from "@/pages/admin/totp_setup/use_totp_submit";

interface TotpSetupFormProps {
  qrCode: string;
  secret: string;
  error?: string;
}

export function TotpSetupForm({ qrCode, secret, error }: TotpSetupFormProps) {
  const { code, setCode, submitting, handleSubmit } = useTotpSubmit("/admin/totp/setup");
  return (
    <div className="w-full max-w-sm">
      <TotpQrSection qrCode={qrCode} />
      <TotpManualEntry secret={secret} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <SetupInstructions codeLength={TOTP_CODE_LENGTH} />
        <TotpCodeInput value={code} onChange={setCode} error={error} />
        <Button
          type="submit"
          className="w-full"
          disabled={code.length < TOTP_CODE_LENGTH}
          busy={submitting}
        >
          {submitting ? "Verifying..." : "Enable two-factor authentication"}
        </Button>
      </form>
    </div>
  );
}
