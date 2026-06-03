import React from "react";

import { buildActionLinkAttrs } from "./action_helpers";
import type { ActionVariant, ActionSize } from "./action";

interface ActionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  busy?: boolean;
  disabled?: boolean;
}

export function ActionLink({
  variant = "primary", size = "md", className, busy = false,
  disabled = false, tabIndex, onClick, children, ...props
}: ActionLinkProps) {
  const attrs = buildActionLinkAttrs({ variant, size, className, busy, disabled, tabIndex, onClick });
  return (
    <a
      {...props}
      className={attrs.cls}
      aria-busy={attrs.busyAttr}
      aria-disabled={attrs.disabledAttr}
      tabIndex={attrs.tabIdx}
      onClick={attrs.clickHandler}
    >
      {children}
    </a>
  );
}
