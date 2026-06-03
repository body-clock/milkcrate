import FeatureCard from "@/components/home/feature_card";

interface FeatureData {
  title: string;
  description: string;
}

interface Props {
  features: FeatureData[];
}

const GRID_CLASSES = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto";

export default function CharacterGrid({ features }: Props) {
  return (
    <div className={GRID_CLASSES}>
      {features.map((f) => (
        <FeatureCard key={f.title} title={f.title} description={f.description} />
      ))}
    </div>
  );
}
