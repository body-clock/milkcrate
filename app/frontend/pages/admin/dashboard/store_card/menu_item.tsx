function getMenuItemClass(danger?: boolean) {
  const base = "block w-full px-3 py-2 text-left text-sm hover:bg-mc-border";
  return danger ? `${base} text-mc-feedback-danger` : `${base} text-mc-text`;
}

export function MenuItem({
  children,
  onClick,
  href,
  asLink,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  asLink?: boolean;
  danger?: boolean;
}) {
  const className = getMenuItemClass(danger);

  if (asLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
