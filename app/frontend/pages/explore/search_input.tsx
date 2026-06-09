import { RefObject } from "react";

interface Props {
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder: string;
  disabled: boolean;
  ariaControls: string | undefined;
  onSearch: (query: string) => void;
}

export default function SearchInput({ inputRef, placeholder, disabled, ariaControls, onSearch }: Props) {
  return (
    <input
      ref={inputRef}
      type="search"
      className="peer min-h-10 w-full rounded-md border border-mc-border bg-mc-bg pl-10 pr-10 text-sm text-mc-text outline-none transition-colors placeholder:text-mc-text-dim focus:border-mc-focus focus:ring-2 focus:ring-mc-focus/40 disabled:cursor-not-allowed disabled:opacity-50"
      placeholder={placeholder}
      onChange={(e) => onSearch(e.target.value)}
      disabled={disabled}
      aria-controls={ariaControls}
      aria-label={placeholder}
      role="searchbox"
    />
  );
}
