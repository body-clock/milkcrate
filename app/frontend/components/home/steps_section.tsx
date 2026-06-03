import StepCard from "@/components/home/step_card";

interface Step {
  number: number;
  title: string;
  description: string;
}
interface Props {
  steps: Step[];
}


export default function StepsSection({ steps }: Props) {
  return (
    <section
      aria-labelledby="home-steps-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <div className="max-w-4xl mx-auto">
        <h2 id="home-steps-heading" className="sr-only">
          How it works
        </h2>
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
      </div>
    </section>
  );
}
