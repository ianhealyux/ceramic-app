'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [downloading, setDownloading] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPublished(false);
      setError(null);
      setPublishing(false);
      setDownloading(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !publishing) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, publishing, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !publishing) onClose();
    },
    [publishing, onClose]
  );

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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al publicar');
      }

      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    const imageId = images[index]?.id || String(index);
    setDownloading(imageId);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo descargar');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ceramica-${postType}-${index + 1}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setError('Error al descargar la imagen. Intentá de nuevo.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={published ? 'Publicado exitosamente' : 'Publicar en Instagram'}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-ceramic-800">
            {published ? '¡Publicado!' : 'Publicar en Instagram'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={publishing}
            aria-label="Cerrar"
            className="rounded-full p-2 text-ceramic-400 transition-colors hover:bg-ceramic-100 hover:text-ceramic-600 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Images */}
        <div className="mb-6 flex flex-wrap justify-center gap-4">
          {images.map((img, i) => (
            <div key={img.id} className="flex flex-col items-center gap-2">
              <div
                className="relative overflow-hidden rounded-lg shadow-md"
                style={{
                  width: postType === 'story' ? 180 : 220,
                  aspectRatio: postType === 'story' ? '9/16' : '4/5',
                }}
              >
                <Image
                  src={img.composedUrl}
                  alt={`Imagen ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="220px"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDownload(img.composedUrl, i)}
                disabled={downloading === img.id}
                className="flex items-center gap-1.5 text-sm text-ceramic-600 transition-colors hover:text-ceramic-800 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading === img.id ? 'Descargando...' : 'Descargar'}
              </button>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        {!published && (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={publishing}
              className="rounded-xl border border-ceramic-300 px-6 py-3 text-sm font-medium text-ceramic-700 transition-colors hover:bg-ceramic-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 rounded-xl bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 disabled:opacity-50"
            >
              {publishing && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {publishing ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        )}

        {/* Success */}
        {published && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-ceramic-600">
              Tu publicación fue enviada correctamente.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-ceramic-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-ceramic-700"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
