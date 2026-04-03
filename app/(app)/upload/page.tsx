'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Area } from 'react-easy-crop';
import CropTool from '@/components/CropTool';
import TrendChips from '@/components/TrendChips';
import PromptInput from '@/components/PromptInput';
import type { PostType, Trend, ProcessingStep, ImageFile, ProcessedImage } from '@/types';

const POST_TYPES: { value: PostType; label: string; desc: string }[] = [
  { value: 'single', label: 'Post', desc: '1 foto (4:5)' },
  { value: 'carousel', label: 'Carrusel', desc: 'Varias fotos (4:5)' },
  { value: 'story', label: 'Historia', desc: '1 o más fotos (9:16)' },
];

const STEP_MESSAGES: Record<ProcessingStep, string> = {
  uploading: 'Subiendo imagen...',
  cropping: 'Recortando...',
  'removing-bg': 'Removiendo fondo...',
  relighting: 'Ajustando iluminación...',
  'generating-bg': 'Generando ambiente...',
  composing: 'Componiendo imagen final...',
  done: '¡Listo!',
  error: 'Ocurrió un error',
};

const DIMENSIONS: Record<PostType, { w: number; h: number }> = {
  single: { w: 1080, h: 1350 },
  carousel: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select-type' | 'upload' | 'crop' | 'describe' | 'processing'>('select-type');
  const [postType, setPostType] = useState<PostType>('single');
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [cropAreas, setCropAreas] = useState<Map<string, Area>>(new Map());
  const [description, setDescription] = useState('');
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('uploading');
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load trends on mount
  const loadTrends = useCallback(async () => {
    try {
      const res = await fetch('/api/trends/current');
      const data = await res.json();
      if (data.trends) setTrends(data.trends);
    } catch {
      // Trends will be empty, user can still describe manually
    }
  }, []);

  // Load trends when reaching describe step
  const goToDescribe = useCallback(() => {
    loadTrends();
    setStep('describe');
  }, [loadTrends]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const maxFiles = postType === 'single' ? 1 : 10;
    const fileList = Array.from(selectedFiles).slice(0, maxFiles);

    const newFiles: ImageFile[] = fileList.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles(newFiles);
    setCurrentFileIndex(0);
    setStep('crop');
  };

  const handleCropComplete = (croppedAreaPixels: Area) => {
    const currentFile = files[currentFileIndex];
    if (!currentFile) return;
    setCropAreas((prev) => new Map(prev).set(currentFile.id, croppedAreaPixels));
  };

  const handleCropNext = () => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex((i) => i + 1);
    } else {
      goToDescribe();
    }
  };

  const getCroppedBlob = async (
    file: ImageFile,
    cropArea: Area
  ): Promise<Blob> => {
    const image = new window.Image();
    image.src = file.preview;
    await new Promise((resolve) => { image.onload = resolve; });

    const canvas = document.createElement('canvas');
    const dims = DIMENSIONS[postType];
    canvas.width = dims.w;
    canvas.height = dims.h;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      image,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      dims.w,
      dims.h
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  };

  const processImage = async (file: ImageFile): Promise<ProcessedImage> => {
    const cropArea = cropAreas.get(file.id);
    if (!cropArea) throw new Error('No crop area');

    // Step 1: Crop
    setProcessingStep('cropping');
    const croppedBlob = await getCroppedBlob(file, cropArea);

    // Step 2: Remove background
    setProcessingStep('removing-bg');
    const removeBgForm = new FormData();
    removeBgForm.append('image', croppedBlob, 'image.png');
    const removeBgRes = await fetch('/api/image/remove-bg', {
      method: 'POST',
      body: removeBgForm,
    });
    const { url: noBgUrl } = await removeBgRes.json();
    if (!removeBgRes.ok) throw new Error('Error removiendo fondo');

    // Step 3: Relight
    setProcessingStep('relighting');
    const relightRes = await fetch('/api/image/relight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: noBgUrl,
        trendPrompt: selectedTrend?.prompt || '',
      }),
    });
    const { url: relitUrl } = await relightRes.json();
    if (!relightRes.ok) throw new Error('Error re-iluminando');

    // Step 4: Generate background
    setProcessingStep('generating-bg');
    const dims = DIMENSIONS[postType];
    const bgRes = await fetch('/api/image/generate-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        trendPrompt: selectedTrend?.prompt || '',
        width: dims.w,
        height: dims.h,
      }),
    });
    const { url: backgroundUrl } = await bgRes.json();
    if (!bgRes.ok) throw new Error('Error generando fondo');

    // Step 5: Compose
    setProcessingStep('composing');
    const composeRes = await fetch('/api/image/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pieceUrl: relitUrl,
        backgroundUrl,
        width: dims.w,
        height: dims.h,
      }),
    });
    const { url: composedUrl } = await composeRes.json();
    if (!composeRes.ok) throw new Error('Error componiendo imagen');

    return {
      id: file.id,
      originalUrl: file.preview,
      noBgUrl,
      relitUrl,
      backgroundUrl,
      composedUrl,
    };
  };

  const handleProcess = async () => {
    setStep('processing');
    setError(null);
    setProcessedImages([]);

    try {
      const results: ProcessedImage[] = [];
      for (const file of files) {
        const result = await processImage(file);
        results.push(result);
      }
      setProcessedImages(results);
      setProcessingStep('done');

      // Store results in sessionStorage for preview page
      sessionStorage.setItem(
        'ceramica-results',
        JSON.stringify({ images: results, postType })
      );
      router.push('/preview');
    } catch (err) {
      setProcessingStep('error');
      setError(err instanceof Error ? err.message : 'Error procesando imagen');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold text-ceramic-800">
        Nueva publicación
      </h2>

      {/* Step 1: Select post type */}
      {step === 'select-type' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ceramic-600">¿Qué querés publicar?</p>
          <div className="flex gap-3">
            {POST_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => {
                  setPostType(pt.value);
                  setStep('upload');
                }}
                className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-ceramic-200 p-6 transition-all hover:border-ceramic-500 hover:bg-ceramic-50"
              >
                <span className="text-lg font-semibold text-ceramic-700">
                  {pt.label}
                </span>
                <span className="text-xs text-ceramic-400">{pt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Upload files */}
      {step === 'upload' && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setStep('select-type')}
            className="self-start text-sm text-ceramic-500 hover:text-ceramic-700"
          >
            ← Cambiar tipo
          </button>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-ceramic-300 p-12 transition-colors hover:border-ceramic-500 hover:bg-ceramic-50"
          >
            <svg className="h-12 w-12 text-ceramic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-ceramic-600">
              {postType === 'single'
                ? 'Hacé click para subir una foto'
                : 'Hacé click para subir tus fotos'}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={postType !== 'single'}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Step 3: Crop */}
      {step === 'crop' && files[currentFileIndex] && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="text-sm text-ceramic-500 hover:text-ceramic-700"
            >
              ← Cambiar foto
            </button>
            {files.length > 1 && (
              <span className="text-sm text-ceramic-500">
                Foto {currentFileIndex + 1} de {files.length}
              </span>
            )}
          </div>

          <CropTool
            imageSrc={files[currentFileIndex].preview}
            postType={postType}
            onCropComplete={handleCropComplete}
          />

          <button
            onClick={handleCropNext}
            className="self-end rounded-lg bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-ceramic-700"
          >
            {currentFileIndex < files.length - 1 ? 'Siguiente foto' : 'Continuar'}
          </button>
        </div>
      )}

      {/* Step 4: Describe + trend */}
      {step === 'describe' && (
        <div className="flex flex-col gap-6">
          <button
            onClick={() => {
              setStep('crop');
              setCurrentFileIndex(0);
            }}
            className="self-start text-sm text-ceramic-500 hover:text-ceramic-700"
          >
            ← Volver al recorte
          </button>

          <PromptInput value={description} onChange={setDescription} />

          {trends.length > 0 && (
            <TrendChips
              trends={trends}
              selected={selectedTrend}
              onSelect={setSelectedTrend}
            />
          )}

          <button
            onClick={handleProcess}
            disabled={!description && !selectedTrend}
            className="self-end rounded-lg bg-ceramic-600 px-8 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Procesar
          </button>
        </div>
      )}

      {/* Step 5: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center gap-6 py-12">
          {processingStep !== 'error' && processingStep !== 'done' && (
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-ceramic-200 border-t-ceramic-600" />
          )}
          <p className="text-lg font-medium text-ceramic-700">
            {STEP_MESSAGES[processingStep]}
          </p>
          {error && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => {
                  setStep('describe');
                  setProcessingStep('uploading');
                  setError(null);
                }}
                className="rounded-lg border border-ceramic-300 px-6 py-2 text-sm text-ceramic-700 hover:bg-ceramic-100"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
