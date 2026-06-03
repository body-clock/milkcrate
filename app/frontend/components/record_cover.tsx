const PLACEHOLDER_CLASS =
  "w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-lg";

function coverImg({ src, alt, loading }: { src: string; alt: string; loading?: "eager" | "lazy" }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      draggable={false}
      loading={loading}
      decoding="async"
    />
  );
}

export function RecordCover({ src, alt, imageLoading }: { src: string | undefined; alt: string; imageLoading?: "eager" | "lazy" }) {
  return src ? coverImg({ src, alt, loading: imageLoading }) : <div className={PLACEHOLDER_CLASS}>♪</div>;
}
