import React from "react";

import type { CardAriaProps } from "./card_aria";
import { PERSPECTIVE_DEPTH } from "./constants";

interface Props extends CardAriaProps {
  children: React.ReactNode;
  className: string;
  handlePointerDown: (e: React.PointerEvent) => void;
  handleFlip: (e: React.MouseEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function cardContainer({
  children, className, roleAttr, tabAttr, label, pressedAttr,
  handlePointerDown, handleFlip, handleKeyDown,
}: Props) {
  return (
    <div
      className={`w-full h-full flex-shrink-0 cursor-pointer ${className}`}
      style={{ perspective: PERSPECTIVE_DEPTH, touchAction: "none" }}
      role={roleAttr}
      tabIndex={tabAttr}
      aria-label={label}
      aria-pressed={pressedAttr}
      onPointerDown={handlePointerDown} onDragStart={(e: React.DragEvent) => e.preventDefault()}
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
