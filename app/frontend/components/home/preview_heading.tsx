import PreviewHeadingContent from "@/components/home/preview_heading_content";

interface Props {
  previewLabel: string;
  previewBlurb: string;
}

export default function PreviewHeading({ previewLabel, previewBlurb }: Props) {
  return (
    <div className="max-w-lg mx-auto text-center mb-8 sm:mb-10">
      <PreviewHeadingContent previewLabel={previewLabel} previewBlurb={previewBlurb} />
    </div>
  );
}
