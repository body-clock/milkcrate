import React from "react";

import { actionClassName } from "./action_base";
import type { ActionVariant, ActionSize } from "./action_base";

interface BuildActionLinkAttrsOpts {
  variant: ActionVariant;
  size: ActionSize;
  className?: string;
  busy: boolean;
  disabled: boolean;
  tabIndex?: number;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

interface ActionLinkAttrs {
  cls: string;
  busyAttr: true | undefined;
  disabledAttr: true | undefined;
  tabIdx: number | undefined;
  clickHandler: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

function createClickHandler(
  unavailable: boolean,
  onClick?: React.MouseEventHandler<HTMLAnchorElement>,
): (event: React.MouseEvent<HTMLAnchorElement>) => void {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (unavailable) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
}

export function buildActionLinkAttrs(opts: BuildActionLinkAttrsOpts): ActionLinkAttrs {
  const { variant, size, className, busy, disabled, tabIndex, onClick } = opts;
  const unavailable = disabled || busy;
  return {
    cls: actionClassName({ variant, size, className }),
    busyAttr: busy || undefined,
    disabledAttr: unavailable || undefined,
    tabIdx: unavailable ? -1 : tabIndex,
    clickHandler: createClickHandler(unavailable, onClick),
  };
}
