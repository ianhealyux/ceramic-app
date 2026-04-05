import { InferenceClient } from '@huggingface/inference';
import sharp from 'sharp';

const hf = new InferenceClient(process.env.HUGGINGFACE_API_TOKEN);

/**
 * Remove background using RMBG-2.0 (via free hf-inference provider)
 * Returns a PNG with transparent background.
 *
 * Steps:
 * 1. Call imageSegmentation → returns mask (base64 B&W image)
 * 2. Apply mask as alpha channel to the original image using sharp
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const segments = await hf.imageSegmentation({
    model: 'briaai/RMBG-2.0',
    provider: 'hf-inference',
    inputs: new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }),
  });

  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error('RMBG-2.0: no se recibió máscara de segmentación');
  }

  // The mask is a base64-encoded B&W image (white = foreground)
  const maskBase64 = segments[0].mask;
  const maskBuffer = Buffer.from(maskBase64, 'base64');

  // Get original image dimensions
  const { width: w, height: h } = await sharp(imageBuffer).metadata();
  if (!w || !h) throw new Error('No se pudieron obtener las dimensiones de la imagen');

  // Resize mask to match original and convert to single-channel grayscale
  const alphaMask = await sharp(maskBuffer)
    .resize(w, h)
    .grayscale()
    .raw()
    .toBuffer();

  // Get original as raw RGBA
  const original = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer();

  // Apply mask as alpha: multiply existing alpha by mask value
  for (let i = 0; i < alphaMask.length; i++) {
    original[i * 4 + 3] = alphaMask[i]; // set alpha from mask
  }

  const result = await sharp(original, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();

  return result;
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
 * Output: generated background image as Blob
 * Dimensions are snapped to multiples of 8 for SDXL compatibility.
 */
export async function generateBackground(
  prompt: string,
  width: number = 1080,
  height: number = 1350
): Promise<Blob> {
  const w = Math.round(width / 8) * 8;
  const h = Math.round(height / 8) * 8;

  const response = await hf.textToImage({
    model: 'stabilityai/stable-diffusion-xl-base-1.0',
    inputs: prompt,
    parameters: {
      width: w,
      height: h,
      num_inference_steps: 30,
      guidance_scale: 7.5,
    },
  }, { outputType: 'blob' });

  return response;
}
