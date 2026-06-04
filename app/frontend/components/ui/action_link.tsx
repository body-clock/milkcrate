import React from "react";

import type { ActionVariant, ActionSize } from "./action";
import { buildActionLinkAttrs } from "./action_helpers";

interface ActionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  busy?: boolean;
  disabled?: boolean;
}

export function ActionLink({
  variant = "primary", size = "md", className, busy = false, disabled = false,
  tabIndex, onClick, children, ...props
}: ActionLinkProps) {
  const a = buildActionLinkAttrs({ variant, size, className, busy, disabled, tabIndex, onClick });
  return (
    <a {...props} className={a.cls} aria-busy={a.busyAttr}
      aria-disabled={a.disabledAttr} tabIndex={a.tabIdx} onClick={a.clickHandler}>
      {children}
    </a>
  );
}
