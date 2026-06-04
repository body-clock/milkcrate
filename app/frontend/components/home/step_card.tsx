interface Props {
  number: number;
  title: string;
  description: string;
}

export default function StepCard({ number, title, description }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-mc-accent text-mc-on-accent flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-mc-text">{title}</h3>
      <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">{description}</p>
    </div>
  );
}
