"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface PostImage {
  filePath: string;
  originalName: string;
}

export default function PostImageGallery({
  images,
}: {
  images: PostImage[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const count = images.length;

  // Grid layout classes based on image count
  let gridClass = "grid gap-3 ";
  if (count === 1) {
    gridClass += "grid-cols-1 max-w-lg";
  } else if (count === 2) {
    gridClass += "grid-cols-2";
  } else if (count === 3) {
    gridClass += "grid-cols-3";
  } else {
    gridClass += "grid-cols-3 sm:grid-cols-3";
  }

  return (
    <>
      <div className={gridClass}>
        {images.map((img, i) => (
          <div
            key={i}
            className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
            onClick={() => setLightboxIndex(i)}
          >
            <Image
              src={img.filePath}
              alt={img.originalName}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes={count === 1 ? "512px" : count === 2 ? "50vw" : "33vw"}
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
          >
            <X size={20} />
          </button>

          {/* Navigation arrows for multiple images */}
          {count > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + count) % count
                  );
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex + 1) % count
                  );
                }}
              >
                ›
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-[85vh] w-full h-full">
            <Image
              src={images[lightboxIndex].filePath}
              alt={images[lightboxIndex].originalName}
              fill
              className="object-contain"
              sizes="100vw"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Image counter */}
          {count > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
              {lightboxIndex + 1} / {count}
            </div>
          )}
        </div>
      )}
    </>
  );
}
