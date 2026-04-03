'use client';

import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import type { PostType } from '@/types';

interface CropToolProps {
  imageSrc: string;
  postType: PostType;
  onCropComplete: (croppedAreaPixels: Area) => void;
}

const ASPECT_RATIOS: Record<PostType, number> = {
  single: 4 / 5,
  carousel: 4 / 5,
  story: 9 / 16,
};

const LABELS: Record<PostType, string> = {
  single: 'Post (4:5)',
  carousel: 'Carrusel (4:5)',
  story: 'Historia (9:16)',
};

export default function CropTool({
  imageSrc,
  postType,
  onCropComplete,
}: CropToolProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      onCropComplete(croppedAreaPixels);
    },
    [onCropComplete]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium text-ceramic-600">
        Recortá tu imagen — {LABELS[postType]}
      </div>

      <div className="relative h-[400px] w-full overflow-hidden rounded-lg bg-ceramic-100">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={ASPECT_RATIOS[postType]}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          showGrid={true}
          style={{
            containerStyle: { borderRadius: '0.5rem' },
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-ceramic-500" htmlFor="zoom">
          Zoom
        </label>
        <input
          id="zoom"
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-ceramic-200 accent-ceramic-600"
        />
      </div>
    </div>
  );
}
