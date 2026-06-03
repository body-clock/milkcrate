import AnimatedBrandMark from "./animated_brand_mark";
import AnimatedHeadline from "./animated_headline";
import AnimatedBody from "./animated_body";
import MarketingLayout from "@/layouts/marketing_layout";

export default function ConfirmationView({ headline, body }: { headline: string; body: string }) {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <AnimatedBrandMark />
        <AnimatedHeadline>{headline}</AnimatedHeadline>
        <AnimatedBody>{body}</AnimatedBody>
      </div>
    </MarketingLayout>
  );
}
