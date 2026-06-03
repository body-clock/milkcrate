import TurnstileSection from "./turnstile_section";

type TurnstileGuardProps = {
  isReady: boolean;
  turnstileRef: React.RefObject<HTMLDivElement | null>;
  turnstile?: { enabled: boolean; site_key: string | null };
  error?: string;
};

export default function TurnstileGuard({ isReady, turnstileRef, turnstile, error }: TurnstileGuardProps) {
  if (!isReady) return null;
  return (
    <TurnstileSection
      turnstileRef={turnstileRef}
      turnstile={turnstile}
      error={error}
    />
  );
}
