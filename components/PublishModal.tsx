'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProcessedImage, PostType } from '@/types';

interface PublishModalProps {
  images: ProcessedImage[];
  postType: PostType;
  isOpen: boolean;
  onClose: () => void;
}

export default function PublishModal({
  images,
  postType,
  isOpen,
  onClose,
}: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: images.map((img) => img.composedUrl),
          postType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ceramica-${postType}-${index + 1}.jpg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ceramic-800">
            {published ? '¡Publicado!' : 'Publicar en Instagram'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ceramic-400 hover:bg-ceramic-100 hover:text-ceramic-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 justify-center">
          {images.map((img, i) => (
            <div key={img.id} className="flex flex-col items-center gap-2">
              <div
                className="relative overflow-hidden rounded-lg shadow-md"
                style={{
                  width: postType === 'story' ? 200 : 250,
                  aspectRatio: postType === 'story' ? '9/16' : '4/5',
                }}
              >
                <Image
                  src={img.composedUrl}
                  alt={`Imagen ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="250px"
                />
              </div>
              <button
                onClick={() => handleDownload(img.composedUrl, i)}
                className="text-sm text-ceramic-600 underline hover:text-ceramic-800"
              >
                Descargar
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!published && (
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-ceramic-300 px-6 py-3 text-sm font-medium text-ceramic-700 hover:bg-ceramic-100"
            >
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-lg bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-ceramic-700 disabled:opacity-50"
            >
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        )}

        {published && (
          <div className="text-center">
            <p className="mb-4 text-ceramic-600">
              Tu publicación fue enviada correctamente.
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-ceramic-600 px-6 py-3 text-sm font-medium text-white hover:bg-ceramic-700"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
