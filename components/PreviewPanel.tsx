'use client';

import Image from 'next/image';
import type { ProcessedImage, PostType } from '@/types';

interface PreviewPanelProps {
  images: ProcessedImage[];
  postType: PostType;
  onRetry: () => void;
  onPublish: () => void;
}

const ASPECT: Record<PostType, string> = {
  single: '4/5',
  carousel: '4/5',
  story: '9/16',
};

export default function PreviewPanel({
  images,
  postType,
  onRetry,
  onPublish,
}: PreviewPanelProps) {
  if (images.length === 0) return null;

  const isSingle = images.length === 1;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-ceramic-800">Vista previa</h2>

      {isSingle ? (
        <div className="flex justify-center">
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-xl shadow-lg"
            style={{ aspectRatio: ASPECT[postType] }}
          >
            <Image
              src={images[0].composedUrl}
              alt="Resultado final"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 384px"
            />
          </div>
        </div>
      ) : (
        <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative w-56 shrink-0 snap-center overflow-hidden rounded-xl shadow-lg md:w-64"
              style={{ aspectRatio: ASPECT[postType] }}
            >
              <Image
                src={img.composedUrl}
                alt={`Resultado ${i + 1} de ${images.length}`}
                fill
                className="object-cover"
                sizes="256px"
              />
              <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                {i + 1}/{images.length}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl border border-ceramic-300 px-6 py-3 text-sm font-medium text-ceramic-700 transition-colors hover:bg-ceramic-100 active:bg-ceramic-200"
        >
          Reintentar
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="rounded-xl bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 active:bg-ceramic-800"
        >
          Publicar
        </button>
      </div>
    </div>
  );
}
