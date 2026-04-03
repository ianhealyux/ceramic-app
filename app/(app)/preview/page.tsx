'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPanel from '@/components/PreviewPanel';
import PublishModal from '@/components/PublishModal';
import type { ProcessedImage, PostType } from '@/types';

export default function PreviewPage() {
  const router = useRouter();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [postType, setPostType] = useState<PostType>('single');
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ceramica-results');
    if (!stored) {
      router.push('/upload');
      return;
    }

    try {
      const data = JSON.parse(stored);
      setImages(data.images);
      setPostType(data.postType);
    } catch {
      router.push('/upload');
    }
  }, [router]);

  const handleRetry = () => {
    // Go back to upload, keep session data so user can modify description/trend
    router.push('/upload');
  };

  const handlePublish = () => {
    setShowPublishModal(true);
  };

  const handleCloseModal = () => {
    setShowPublishModal(false);
  };

  if (images.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ceramic-200 border-t-ceramic-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/upload')}
          className="text-sm text-ceramic-500 hover:text-ceramic-700"
        >
          ← Nueva publicación
        </button>
      </div>

      <PreviewPanel
        images={images}
        postType={postType}
        onRetry={handleRetry}
        onPublish={handlePublish}
      />

      <PublishModal
        images={images}
        postType={postType}
        isOpen={showPublishModal}
        onClose={handleCloseModal}
      />
    </div>
  );
}
