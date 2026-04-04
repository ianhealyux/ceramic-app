'use client';

import { useState, useCallback, useRef, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Area } from 'react-easy-crop';
import CropTool from '@/components/CropTool';
import TrendChips from '@/components/TrendChips';
import PromptInput from '@/components/PromptInput';
import type { PostType, Trend, ProcessingStep, ImageFile, ProcessedImage } from '@/types';

type Step = 'select-type' | 'upload' | 'crop' | 'describe' | 'processing';

const POST_TYPES: { value: PostType; label: string; desc: string; icon: string }[] = [
  { value: 'single', label: 'Post', desc: '1 foto (4:5)', icon: '🖼' },
  { value: 'carousel', label: 'Carrusel', desc: 'Varias fotos (4:5)', icon: '📷' },
  { value: 'story', label: 'Historia', desc: '1 o más fotos (9:16)', icon: '📱' },
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

const STEP_ORDER: ProcessingStep[] = [
  'cropping', 'removing-bg', 'relighting', 'generating-bg', 'composing',
];

const DIMENSIONS: Record<PostType, { w: number; h: number }> = {
  single: { w: 1080, h: 1350 },
  carousel: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select-type');
  const [postType, setPostType] = useState<PostType>('single');
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [cropAreas, setCropAreas] = useState<Map<string, Area>>(new Map());
  const [description, setDescription] = useState('');
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('uploading');
  const [processingImageIndex, setProcessingImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadTrends = useCallback(async () => {
    try {
      const res = await fetch('/api/trends/current');
      if (!res.ok) return;
      const data = await res.json();
      if (data.trends) setTrends(data.trends);
    } catch {
      // Trends optional — user can describe manually
    }
  }, []);

  const goToDescribe = useCallback(() => {
    loadTrends();
    setStep('describe');
  }, [loadTrends]);

  // --- File handling ---

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    const maxFiles = postType === 'single' ? 1 : 10;
    const incoming = Array.from(fileList).slice(0, maxFiles);

    const invalid = incoming.find(
      (f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE
    );
    if (invalid) {
      if (!ACCEPTED_TYPES.includes(invalid.type)) {
        setError('Solo se aceptan imágenes JPG, PNG o WebP.');
      } else {
        setError('La imagen es muy pesada (máx. 15 MB).');
      }
      return;
    }

    setError(null);
    const newFiles: ImageFile[] = incoming.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setFiles(newFiles);
    setCurrentFileIndex(0);
    setStep('crop');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) validateAndAddFiles(e.target.files);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  // --- Crop ---

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

  // --- Processing pipeline ---

  const apiCall = async (url: string, options: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Error en ${url}`);
    }
    return res.json();
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
    const { url: noBgUrl } = await apiCall('/api/image/remove-bg', {
      method: 'POST',
      body: removeBgForm,
    });

    // Step 3: Relight
    setProcessingStep('relighting');
    const { url: relitUrl } = await apiCall('/api/image/relight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: noBgUrl,
        trendPrompt: selectedTrend?.prompt || '',
      }),
    });

    // Step 4: Generate background
    setProcessingStep('generating-bg');
    const dims = DIMENSIONS[postType];
    const { url: backgroundUrl } = await apiCall('/api/image/generate-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        trendPrompt: selectedTrend?.prompt || '',
        width: dims.w,
        height: dims.h,
      }),
    });

    // Step 5: Compose
    setProcessingStep('composing');
    const { url: composedUrl } = await apiCall('/api/image/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pieceUrl: relitUrl,
        backgroundUrl,
        width: dims.w,
        height: dims.h,
      }),
    });

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
    setProcessingImageIndex(0);

    try {
      const results: ProcessedImage[] = [];
      for (let i = 0; i < files.length; i++) {
        setProcessingImageIndex(i);
        const result = await processImage(files[i]);
        results.push(result);
      }
      setProcessingStep('done');

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

  // --- Progress calculation ---
  const progressPercent = (() => {
    if (step !== 'processing' || processingStep === 'error') return 0;
    if (processingStep === 'done') return 100;
    const stepIdx = STEP_ORDER.indexOf(processingStep);
    if (stepIdx < 0) return 0;
    const perImage = 100 / files.length;
    const perStep = perImage / STEP_ORDER.length;
    return Math.round(processingImageIndex * perImage + stepIdx * perStep);
  })();

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl font-bold text-ceramic-800">
        Nueva publicación
      </h2>

      {/* Step 1: Select post type */}
      {step === 'select-type' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ceramic-600">¿Qué querés publicar?</p>
          <div className="grid grid-cols-3 gap-3">
            {POST_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => {
                  setPostType(pt.value);
                  setStep('upload');
                }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-ceramic-200 p-5 transition-all hover:border-ceramic-500 hover:bg-ceramic-50 active:bg-ceramic-100 md:p-6"
              >
                <span className="text-2xl" aria-hidden="true">{pt.icon}</span>
                <span className="text-base font-semibold text-ceramic-700">
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
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep('select-type')}
            className="self-start text-sm text-ceramic-500 hover:text-ceramic-700"
          >
            ← Cambiar tipo
          </button>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 transition-all md:p-14 ${
              isDragging
                ? 'border-ceramic-500 bg-ceramic-100'
                : 'border-ceramic-300 hover:border-ceramic-500 hover:bg-ceramic-50'
            }`}
          >
            <svg className="h-12 w-12 text-ceramic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-center text-sm text-ceramic-600">
              {isDragging
                ? 'Soltá la imagen acá'
                : postType === 'single'
                  ? 'Tocá para subir una foto o arrastrala acá'
                  : 'Tocá para subir tus fotos o arrastralas acá'}
            </p>
            <p className="text-xs text-ceramic-400">JPG, PNG o WebP — máx. 15 MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple={postType !== 'single'}
            onChange={handleFileSelect}
            className="hidden"
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* Step 3: Crop */}
      {step === 'crop' && files[currentFileIndex] && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setFiles([]);
                setCropAreas(new Map());
              }}
              className="text-sm text-ceramic-500 hover:text-ceramic-700"
            >
              ← Cambiar foto
            </button>
            {files.length > 1 && (
              <span className="text-sm font-medium text-ceramic-500">
                Foto {currentFileIndex + 1} de {files.length}
              </span>
            )}
          </div>

          {/* Thumbnail strip for carousel */}
          {files.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {files.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCurrentFileIndex(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg transition-all ${
                    i === currentFileIndex
                      ? 'ring-2 ring-ceramic-600 ring-offset-1'
                      : cropAreas.has(f.id)
                        ? 'opacity-70 ring-1 ring-green-400'
                        : 'opacity-50 ring-1 ring-ceramic-200'
                  }`}
                >
                  <Image src={f.preview} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="56px" />
                  {cropAreas.has(f.id) && i !== currentFileIndex && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <CropTool
            imageSrc={files[currentFileIndex].preview}
            postType={postType}
            onCropComplete={handleCropComplete}
          />

          <button
            type="button"
            onClick={handleCropNext}
            className="self-end rounded-xl bg-ceramic-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 active:bg-ceramic-800"
          >
            {currentFileIndex < files.length - 1 ? 'Siguiente foto →' : 'Continuar →'}
          </button>
        </div>
      )}

      {/* Step 4: Describe + trend */}
      {step === 'describe' && (
        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setStep('crop');
              setCurrentFileIndex(0);
            }}
            className="self-start text-sm text-ceramic-500 hover:text-ceramic-700"
          >
            ← Volver al recorte
          </button>

          {/* Mini preview of selected images */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg shadow-sm"
              >
                <Image src={f.preview} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="64px" />
              </div>
            ))}
          </div>

          <PromptInput value={description} onChange={setDescription} />

          {trends.length > 0 && (
            <TrendChips
              trends={trends}
              selected={selectedTrend}
              onSelect={setSelectedTrend}
            />
          )}

          <button
            type="button"
            onClick={handleProcess}
            disabled={!description && !selectedTrend}
            className="self-end rounded-xl bg-ceramic-600 px-8 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Procesar
          </button>
        </div>
      )}

      {/* Step 5: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center gap-6 py-12">
          {processingStep !== 'error' && processingStep !== 'done' && (
            <>
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-ceramic-200 border-t-ceramic-600" />

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-2 overflow-hidden rounded-full bg-ceramic-100">
                  <div
                    className="h-full rounded-full bg-ceramic-500 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {files.length > 1 && (
                  <p className="mt-1 text-center text-xs text-ceramic-400">
                    Imagen {processingImageIndex + 1} de {files.length}
                  </p>
                )}
              </div>
            </>
          )}

          <p className="text-lg font-medium text-ceramic-700">
            {STEP_MESSAGES[processingStep]}
          </p>

          {error && (
            <div className="flex flex-col items-center gap-3">
              <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep('describe');
                  setProcessingStep('uploading');
                  setError(null);
                }}
                className="rounded-xl border border-ceramic-300 px-6 py-2.5 text-sm font-medium text-ceramic-700 transition-colors hover:bg-ceramic-100"
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
