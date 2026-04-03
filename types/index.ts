export type PostType = 'single' | 'carousel' | 'story';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Trend {
  title: string;       // Spanish, max 4 words (e.g. "Tonos tierra")
  prompt: string;      // English, scene description for SD (no piece mention)
  colors: string[];    // 2-3 hex values (e.g. ["#C4A882", "#8B6F47"])
}

export type ProcessingStep =
  | 'uploading'
  | 'cropping'
  | 'removing-bg'
  | 'relighting'
  | 'generating-bg'
  | 'composing'
  | 'done'
  | 'error';

export interface ImageFile {
  id: string;
  file: File;
  preview: string;       // Object URL for local preview
  croppedBlob?: Blob;
  croppedUrl?: string;   // Blob URL after crop
}

export interface ProcessedImage {
  id: string;
  originalUrl: string;
  noBgUrl: string;
  relitUrl: string;
  backgroundUrl: string;
  composedUrl: string;   // Final result
}

export interface ImageResult {
  images: ProcessedImage[];
  postType: PostType;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface UploadState {
  files: ImageFile[];
  postType: PostType;
  description: string;
  selectedTrend: Trend | null;
  currentStep: ProcessingStep;
  processedImages: ProcessedImage[];
}
