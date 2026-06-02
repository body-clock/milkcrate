/**
 * Renders either a record cover image or a placeholder with the ♪ note character.
 */
export function RecordCover({
  src,
  alt,
  imageLoading,
}: {
  src: string | undefined;
  alt: string;
  imageLoading?: "eager" | "lazy";
}) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      draggable={false}
      loading={imageLoading}
      decoding="async"
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-mc-bg-raised text-mc-text-dim text-lg">
      ♪
    </div>
  );
}
