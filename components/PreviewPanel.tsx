'use client';

import Image from 'next/image';
import type { ProcessedImage, PostType } from '@/types';

interface PreviewPanelProps {
  images: ProcessedImage[];
  postType: PostType;
  onRetry: () => void;
  onPublish: () => void;
}

const DIMENSIONS: Record<PostType, { w: number; h: number }> = {
  single: { w: 1080, h: 1350 },
  carousel: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

export default function PreviewPanel({
  images,
  postType,
  onRetry,
  onPublish,
}: PreviewPanelProps) {
  const dims = DIMENSIONS[postType];

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-ceramic-800">Vista previa</h2>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative flex-shrink-0 overflow-hidden rounded-lg shadow-lg"
            style={{
              width: Math.min(dims.w / 3, 360),
              aspectRatio: `${dims.w}/${dims.h}`,
            }}
          >
            <Image
              src={img.composedUrl}
              alt="Resultado final"
              fill
              className="object-cover"
              sizes="360px"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="rounded-lg border border-ceramic-300 px-6 py-3 text-sm font-medium text-ceramic-700 transition-colors hover:bg-ceramic-100"
        >
          Reintentar
        </button>
        <button
          onClick={onPublish}
          className="rounded-lg bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700"
        >
          Publicar
        </button>
      </div>
    </div>
  );
}
