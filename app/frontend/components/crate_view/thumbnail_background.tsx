import React from "react";

function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  el.style.display = "none";
}

export default function ThumbnailBackground({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 rounded-lg overflow-hidden z-0 pointer-events-none">
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover saturate-75"
        style={{ filter: "blur(8px)" }}
        draggable={false}
        onError={handleImageError}
      />
    </div>
  );
}
