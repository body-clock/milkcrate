import StepsGrid from "@/components/home/steps_grid";

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
        <StepsGrid steps={steps} />
      </div>
    </section>
  );
}
