import ClearIcon from './search_bar_clear_icon';

export default function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-mc-text-dim hover:text-mc-text peer-[:not(:placeholder-shown)]:block"
      aria-label="Clear search"
    >
      <ClearIcon />
    </button>
  );
}
