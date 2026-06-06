export default function BenefitItem({ benefit }: { benefit: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className="mt-px shrink-0 text-mc-accent">•</span>
      <span>{benefit}</span>
    </li>
  );
}
