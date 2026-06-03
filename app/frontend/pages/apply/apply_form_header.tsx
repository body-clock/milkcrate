import type { Copy } from "./types";

interface ApplyFormHeaderProps {
  copy: Copy;
}

export function ApplyFormHeader({ copy }: ApplyFormHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-mc-text mb-2">{copy.headline}</h1>
      <p className="text-sm text-mc-text-dim mb-6 leading-relaxed">{copy.subhead}</p>
    </>
  );
}
