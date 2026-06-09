import { useRef } from "react";

import ClearButton from "./clear_button";
import SearchIcon from "./search_bar_search_icon";
import SearchInput from "./search_input";

interface ExploreSearchBarProps {
  placeholder: string;
  onSearch: (query: string) => void;
  disabled?: boolean;
  "aria-controls"?: string;
}

export default function ExploreSearchBar({
  placeholder,
  onSearch,
  disabled = false,
  "aria-controls": ariaControls,
}: ExploreSearchBarProps) {
  return (
    <div className="relative">
      <SearchIcon />
      <SearchInput
        inputRef={useRef<HTMLInputElement>(null)}
        placeholder={placeholder}
        disabled={disabled}
        ariaControls={ariaControls}
        onSearch={onSearch}
      />
      <ClearButton
        onClick={() => {
          onSearch("");
        }}
      />
    </div>
  );
}
