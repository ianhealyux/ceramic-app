import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

/**
 * Remove background using RMBG-1.4
 * Input: image bytes
 * Output: PNG with transparent background
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Blob> {
  const uint8 = new Uint8Array(imageBuffer);
  const result = await hf.imageSegmentation({
    model: 'briaai/RMBG-1.4',
    data: new Blob([uint8]),
  });

  // RMBG-1.4 returns the segmented image directly as a Blob
  // The HF inference API wraps it — we need the raw image output
  if (result instanceof Blob) {
    return result;
  }

  // Fallback: if the API returns segmentation masks, use the first one
  // This shouldn't happen with RMBG-1.4 but handles edge cases
  throw new Error('Formato de respuesta inesperado de RMBG-1.4');
}

/**
 * Relight image using IC-Light
 * Input: PNG image (transparent bg) + prompt describing desired lighting
 * Output: Re-lit image as Blob
 * Fixed denoising_strength: 0.20 (only adjusts light, preserves piece)
 */
export async function relightImage(
  imageBuffer: Buffer,
  lightingPrompt: string
): Promise<Blob> {
  const response = await hf.imageToImage({
    model: 'lllyasviel/ic-light',
    inputs: new Blob([new Uint8Array(imageBuffer)]),
    parameters: {
      prompt: lightingPrompt,
      strength: 0.20,
    },
  });

  return response;
}

/**
 * Generate background/scene using SDXL
 * Input: text prompt describing the scene
 * Output: generated background image as Blob (1024x1024 default)
 */
export async function generateBackground(
  prompt: string,
  width: number = 1080,
  height: number = 1350
): Promise<Blob> {
  const response = await hf.textToImage({
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    inputs: prompt,
    parameters: {
      width,
      height,
      num_inference_steps: 30,
      guidance_scale: 7.5,
    },
  });

  return response;
}
