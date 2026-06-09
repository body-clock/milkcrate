import { useCallback, useRef } from "react";

interface ExploreSearchBarProps {
  placeholder: string;
  onSearch: (query: string) => void;
  disabled?: boolean;
  "aria-controls"?: string;
}

/**
 * Search input for the explore page.
 *
 * Emits the current query on every change via `onSearch`.
 * The parent hook handles debouncing; this component owns only the input
 * presentation and immediate change dispatch.
 */
export default function ExploreSearchBar({
  placeholder,
  onSearch,
  disabled = false,
  "aria-controls": ariaControls,
}: ExploreSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearch(e.target.value);
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    onSearch("");
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <div className="relative">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mc-text-dim"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>

      <input
        ref={inputRef}
        type="search"
        className="peer min-h-10 w-full rounded-md border border-mc-border bg-mc-bg pl-10 pr-10 text-sm text-mc-text outline-none transition-colors placeholder:text-mc-text-dim focus:border-mc-focus focus:ring-2 focus:ring-mc-focus/40 disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={placeholder}
        onChange={handleChange}
        disabled={disabled}
        aria-controls={ariaControls}
        aria-label={placeholder}
        role="searchbox"
      />

      {/* Clear button — only visible when there's input */}
      <button
        type="button"
        onClick={handleClear}
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-mc-text-dim hover:text-mc-text peer-[:not(:placeholder-shown)]:block"
        aria-label="Clear search"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
