import Spinner from "@/components/spinner";

interface Props {
  isSubmitting: boolean;
  label: string;
}

export default function SubmitContent({ isSubmitting, label }: Props) {
  if (isSubmitting) {
    return (
      <>
        <Spinner size="sm" className="text-mc-on-accent/80" />
        <span>Checking...</span>
      </>
    );
  }
  return <span>{label}</span>;
}
