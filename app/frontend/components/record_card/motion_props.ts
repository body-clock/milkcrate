export function buildMotionProps(framed: boolean) {
  return {
    motionClass: framed ? "rounded-lg" : undefined,
    motionShadow: framed
      ? "0 0 0 1px var(--mc-border), 0 25px 50px -12px rgb(0 0 0 / 0.35)"
      : undefined,
  };
}
