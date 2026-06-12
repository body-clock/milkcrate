export function SearchInput({
  query,
  onChange,
}: {
  query: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label htmlFor="store-search" className="sr-only">
        Search stores
      </label>
      <input
        id="store-search"
        type="search"
        placeholder="Search stores…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2 text-sm text-mc-text placeholder:text-mc-text-dim focus:border-mc-focus focus:outline-none"
      />
    </div>
  );
}
