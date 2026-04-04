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
      <p className="text-sm font-medium text-ceramic-600">
        Ajustá el recorte — {LABELS[postType]}
      </p>

      <div className="relative h-[50vh] min-h-[300px] max-h-[500px] w-full overflow-hidden rounded-xl bg-ceramic-100">
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
            containerStyle: { borderRadius: '0.75rem' },
          }}
        />
      </div>

      <div className="flex items-center gap-3 px-1">
        <label className="shrink-0 text-sm text-ceramic-500" htmlFor="crop-zoom">
          Zoom
        </label>
        <input
          id="crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label={`Zoom: ${zoom.toFixed(1)}x`}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-ceramic-200 accent-ceramic-600"
        />
        <span className="w-10 text-right text-xs tabular-nums text-ceramic-400">
          {zoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
