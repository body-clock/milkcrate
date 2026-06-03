import StepCard from "@/components/home/step_card";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface Props {
  steps: Step[];
}

export default function StepsGrid({ steps }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
      {steps.map((s) => (
        <StepCard
          key={s.number}
          number={s.number}
          title={s.title}
          description={s.description}
        />
      ))}
    </div>
  );
}
