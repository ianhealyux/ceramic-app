import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { saveTrends } from '@/lib/trends';
import type { Trend } from '@/types';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const SYSTEM_PROMPT = `You are a trend researcher specializing in artisan ceramics and handmade pottery styling for social media.

Your task: Identify current trends in styling and photographing handmade ceramic pieces for Instagram, Pinterest, and artisan design shops.

Focus on:
- Background settings and environments trending for ceramic product photography
- Color palettes popular in home decor and artisan markets
- Lighting styles trending on Instagram for handmade goods
- Scene compositions that get high engagement

Return EXACTLY 6 trend objects as a JSON array. Each object must have:
- "title": Short trend name in Spanish, 2-4 words (e.g. "Tonos tierra", "Jardín salvaje")
- "prompt": Scene description in English for Stable Diffusion image generation. Describe ONLY the environment: surface, setting, lighting, and props. Do NOT mention any ceramic piece, pottery, cup, mug, plate, or bowl. Max 25 words.
- "colors": Array of exactly 2 or 3 hex color codes representing the trend palette (e.g. ["#C4A882", "#8B6F47"])

IMPORTANT:
- Return ONLY the raw JSON array. No markdown, no code blocks, no explanation.
- Each hex color must be exactly 7 characters: # followed by 6 hex digits.
- Each prompt must be a vivid scene description that works as a Stable Diffusion backdrop.
- Make each trend visually distinct from the others.`;

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  // Find the JSON array directly
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    return text.slice(arrStart, arrEnd + 1);
  }

  return text.trim();
}

function validateTrends(data: unknown): data is Trend[] {
  if (!Array.isArray(data) || data.length !== 6) return false;

  return data.every(
    (t) =>
      typeof t.title === 'string' &&
      t.title.length > 0 &&
      t.title.split(/\s+/).length <= 4 &&
      typeof t.prompt === 'string' &&
      t.prompt.length > 0 &&
      Array.isArray(t.colors) &&
      t.colors.length >= 2 &&
      t.colors.length <= 3 &&
      t.colors.every((c: unknown) => typeof c === 'string' && HEX_RE.test(c))
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurada' },
      { status: 500 }
    );
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            'Generate the latest ceramic styling trends. Return ONLY the JSON array.',
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    const raw = extractJSON(textBlock.text);
    const trends: unknown = JSON.parse(raw);

    if (!validateTrends(trends)) {
      throw new Error(
        `Invalid trends structure: got ${Array.isArray(trends) ? trends.length : typeof trends} items`
      );
    }

    await saveTrends(trends);

    return NextResponse.json({ success: true, trends });
  } catch (error) {
    console.error('Error refreshing trends:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tendencias' },
      { status: 500 }
    );
  }
}
