export default function ContextListItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2">
      <span className="text-mc-accent flex-shrink-0 select-none mt-px" aria-hidden="true">
        •
      </span>
      <span>{text}</span>
    </li>
  );
}
