import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { saveTrends } from '@/lib/trends';
import type { Trend } from '@/types';

const SYSTEM_PROMPT = `You are a trend researcher specializing in artisan ceramics and handmade pottery styling for social media.

Your task: Search for current trends in styling and photographing handmade ceramic pieces for Instagram, Pinterest, and artisan design shops.

Focus on:
- Background settings and environments trending for ceramic product photography
- Color palettes popular in home decor and artisan markets
- Lighting styles trending on Instagram for handmade goods
- Scene compositions that get high engagement

Return EXACTLY 6 trend objects as a JSON array. Each object must have:
- "title": Short name in Spanish, max 4 words (e.g. "Tonos tierra")
- "prompt": Scene description in English for Stable Diffusion. Describe the ENVIRONMENT ONLY (surface, setting, lighting, props). Do NOT mention the ceramic piece itself. Max 25 words.
- "colors": Array of 2-3 hex color codes representing the palette

Return ONLY the JSON array, no other text.`;

export async function POST(req: NextRequest) {
  // Verify cron secret for Vercel Cron jobs
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
          content: 'Search for the latest ceramic styling trends and return the JSON array.',
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    const trends: Trend[] = JSON.parse(textContent.text);

    // Validate structure
    if (!Array.isArray(trends) || trends.length !== 6) {
      throw new Error('Invalid trends format: expected 6 items');
    }

    for (const trend of trends) {
      if (!trend.title || !trend.prompt || !Array.isArray(trend.colors)) {
        throw new Error('Invalid trend object structure');
      }
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
