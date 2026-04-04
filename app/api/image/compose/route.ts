import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { authOptions } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { pieceUrl, backgroundUrl, width, height } = await req.json();

    if (!pieceUrl || !backgroundUrl) {
      return NextResponse.json(
        { error: 'Faltan URLs de pieza o fondo' },
        { status: 400 }
      );
    }

    const targetWidth = width || 1080;
    const targetHeight = height || 1350;

    // Fetch both images
    const [pieceRes, bgRes] = await Promise.all([
      fetch(pieceUrl),
      fetch(backgroundUrl),
    ]);

    if (!pieceRes.ok) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen de la pieza' },
        { status: 502 }
      );
    }
    if (!bgRes.ok) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen del fondo' },
        { status: 502 }
      );
    }

    const pieceBuffer = Buffer.from(await pieceRes.arrayBuffer());
    const bgBuffer = Buffer.from(await bgRes.arrayBuffer());

    // Resize background to target dimensions
    const background = await sharp(bgBuffer)
      .resize(targetWidth, targetHeight, { fit: 'cover' })
      .toBuffer();

    // Get piece dimensions to center it
    const pieceMeta = await sharp(pieceBuffer).metadata();
    const pieceW = pieceMeta.width || targetWidth;
    const pieceH = pieceMeta.height || targetHeight;

    // Scale piece to fit ~80% of the target area
    const scale = Math.min(
      (targetWidth * 0.8) / pieceW,
      (targetHeight * 0.8) / pieceH
    );
    const scaledW = Math.round(pieceW * scale);
    const scaledH = Math.round(pieceH * scale);

    const piece = await sharp(pieceBuffer)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .toBuffer();

    // Create soft drop shadow with padding so blur doesn't clip at edges
    const shadowOffset = 8;
    const shadowBlur = 20;
    const shadowPadding = shadowBlur * 3;

    const { data: shadowData, info: shadowInfo } = await sharp(piece)
      .ensureAlpha()
      .extend({
        top: shadowPadding,
        bottom: shadowPadding,
        left: shadowPadding,
        right: shadowPadding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .modulate({ brightness: 0 })
      .blur(shadowBlur)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Reduce shadow opacity to 40% for a natural look
    for (let i = 3; i < shadowData.length; i += 4) {
      shadowData[i] = Math.round(shadowData[i] * 0.4);
    }

    const shadow = await sharp(shadowData, {
      raw: {
        width: shadowInfo.width,
        height: shadowInfo.height,
        channels: 4 as 4,
      },
    })
      .png()
      .toBuffer();

    // Center position
    const left = Math.round((targetWidth - scaledW) / 2);
    const top = Math.round((targetHeight - scaledH) / 2);

    // Compose: background + shadow + piece
    const composed = await sharp(background)
      .composite([
        {
          input: shadow,
          left: left + shadowOffset - shadowPadding,
          top: top + shadowOffset - shadowPadding,
          blend: 'over',
        },
        {
          input: piece,
          left,
          top,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();

    const { url } = await put(
      `composed/${Date.now()}.jpg`,
      composed,
      { access: 'public', contentType: 'image/jpeg' }
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error composing image:', error);
    return NextResponse.json(
      { error: 'Error al componer la imagen' },
      { status: 500 }
    );
  }
}
