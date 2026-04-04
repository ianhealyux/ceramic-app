import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);

/**
 * Remove background using RMBG-1.4
 * Uses raw fetch because RMBG-1.4 returns a PNG image directly,
 * not the JSON segmentation masks that hf.imageSegmentation() expects.
 * Retries on 503 (model loading) up to 3 times with increasing wait.
 */
export async function removeBackground(imageBuffer: Buffer): Promise<Buffer> {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    throw new Error('HUGGINGFACE_API_TOKEN no configurado');
  }

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/briaai/RMBG-1.4',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(imageBuffer),
      }
    );

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('image')) {
        return Buffer.from(await response.arrayBuffer());
      }
      // If JSON response, the model might have returned an error
      const json = await response.json();
      throw new Error(`Respuesta inesperada de RMBG-1.4: ${JSON.stringify(json)}`);
    }

    // Model is loading — wait and retry
    if (response.status === 503 && attempt < maxRetries - 1) {
      const body = await response.json().catch(() => ({}));
      const waitTime = (body as { estimated_time?: number }).estimated_time || 20;
      console.log(`RMBG-1.4 cargando, reintentando en ${waitTime}s (intento ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitTime * 1000));
      continue;
    }

    const text = await response.text();
    throw new Error(`Error de RMBG-1.4 (${response.status}): ${text}`);
  }

  throw new Error('RMBG-1.4: máximo de reintentos alcanzado');
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
  });

  return response;
}
