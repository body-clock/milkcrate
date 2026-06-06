interface SetupInstructionsProps {
  codeLength: number;
}

export function SetupInstructions({ codeLength }: SetupInstructionsProps) {
  return (
    <p className="text-xs text-center text-mc-text-dim">
      After scanning, enter the {codeLength}-digit code from your app to confirm it&apos;s set up
      correctly.
    </p>
  );
}
