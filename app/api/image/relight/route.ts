import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
import { relightImage } from '@/lib/huggingface';
import { buildLightingPrompt } from '@/lib/prompt-builder';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { imageUrl, trendPrompt } = await req.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Falta la URL de la imagen' },
        { status: 400 }
      );
    }

    // Fetch the no-bg image from Blob storage
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen' },
        { status: 502 }
      );
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const lightingPrompt = buildLightingPrompt(trendPrompt || '');
    const resultBlob = await relightImage(imageBuffer, lightingPrompt);

    const { url } = await put(
      `relit/${Date.now()}.png`,
      resultBlob,
      { access: 'public', contentType: 'image/png' }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error relighting image:', error);
    return NextResponse.json(
      { error: 'Error al re-iluminar la imagen' },
      { status: 500 }
    );
  }
}
