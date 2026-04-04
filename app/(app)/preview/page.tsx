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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('ceramica-results');
    if (!stored) {
      router.replace('/upload');
      return;
    }

    try {
      const data = JSON.parse(stored);
      if (!data.images?.length) throw new Error('No images');
      setImages(data.images);
      setPostType(data.postType);
      setLoaded(true);
    } catch {
      router.replace('/upload');
    }
  }, [router]);

  const handleRetry = () => {
    sessionStorage.removeItem('ceramica-results');
    router.push('/upload');
  };

  const handleNewPost = () => {
    sessionStorage.removeItem('ceramica-results');
    router.push('/upload');
  };

  if (!loaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ceramic-200 border-t-ceramic-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleNewPost}
        className="self-start text-sm text-ceramic-500 hover:text-ceramic-700"
      >
        ← Nueva publicación
      </button>

      <PreviewPanel
        images={images}
        postType={postType}
        onRetry={handleRetry}
        onPublish={() => setShowPublishModal(true)}
      />

      <PublishModal
        images={images}
        postType={postType}
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />
    </div>
  );
}
