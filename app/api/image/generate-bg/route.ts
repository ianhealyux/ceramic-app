import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
import { generateBackground } from '@/lib/huggingface';
import { buildPrompt } from '@/lib/prompt-builder';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { description, trendPrompt, width, height } = await req.json();

    if (!description && !trendPrompt) {
      return NextResponse.json(
        { error: 'Falta descripción o tendencia' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(description || '', trendPrompt || '');
    const resultBlob = await generateBackground(
      prompt,
      width || 1080,
      height || 1350
    );

    const { url } = await put(
      `backgrounds/${Date.now()}.png`,
      resultBlob,
      { access: 'public', contentType: 'image/png' }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating background:', error);
    return NextResponse.json(
      { error: 'Error al generar el fondo' },
      { status: 500 }
    );
  }
}
