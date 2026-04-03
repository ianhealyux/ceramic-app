import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publish } from '@/lib/instagram';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { imageUrls, caption, postType } = await req.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No se recibieron imágenes' },
        { status: 400 }
      );
    }

    const result = await publish({
      imageUrls,
      caption,
      postType: postType || 'single',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error publishing:', error);
    return NextResponse.json(
      { error: 'Error al publicar' },
      { status: 500 }
    );
  }
}
