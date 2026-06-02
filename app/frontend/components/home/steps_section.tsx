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
    <section className="border-t border-mc-border py-10 sm:py-16" aria-labelledby="home-steps-heading">
      <div className="max-w-4xl mx-auto">
        <h2 id="home-steps-heading" className="sr-only">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          {steps.map((step) => (
            <StepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
