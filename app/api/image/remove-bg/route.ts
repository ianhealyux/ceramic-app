import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import { authOptions } from '@/lib/auth';
import { removeBackground } from '@/lib/huggingface';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió imagen' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resultBuffer = await removeBackground(buffer);

    const { url } = await put(
      `no-bg/${Date.now()}.png`,
      resultBuffer,
      { access: 'public', contentType: 'image/png' }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error removing background:', error);
    return NextResponse.json(
      { error: 'Error al remover el fondo' },
      { status: 500 }
    );
  }
}
