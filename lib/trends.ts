import type { Trend } from '@/types';

const KV_KEY = 'trends:current';
const TTL_SECONDS = 16 * 24 * 60 * 60; // 16 days

export const FALLBACK_TRENDS: Trend[] = [
  {
    title: 'Tonos tierra',
    prompt: 'rustic wooden table with dried eucalyptus branches, warm terracotta tones, soft afternoon light',
    colors: ['#C4A882', '#8B6F47', '#D4B896'],
  },
  {
    title: 'Jardín salvaje',
    prompt: 'wild garden setting with dried wildflowers and sage, weathered stone surface, dappled natural light',
    colors: ['#7A9E7E', '#4A6741', '#B5C4A1'],
  },
  {
    title: 'Nórdico minimalista',
    prompt: 'white oak shelf, Scandinavian interior, soft morning diffused light, clean linen background',
    colors: ['#E8E4DC', '#C4BDB0', '#8A8078'],
  },
  {
    title: 'Lino y madera',
    prompt: 'natural linen surface with raw wood elements, neutral tones, soft side lighting',
    colors: ['#D4C5A9', '#A89070', '#8B7355'],
  },
  {
    title: 'Luz de atardecer',
    prompt: 'warm golden hour light, terracotta tiles, mediterranean courtyard, long shadows',
    colors: ['#E8A87C', '#C4704A', '#F0C89A'],
  },
  {
    title: 'Estudio artesanal',
    prompt: 'artisan workshop setting, concrete surface, tools in background softly blurred, natural overhead light',
    colors: ['#9B9B9B', '#6B6B6B', '#BEBEBE'],
  },
];

async function getKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  const { kv } = await import('@vercel/kv');
  return kv;
}

export async function getTrends(): Promise<Trend[]> {
  try {
    const kvClient = await getKv();
    if (!kvClient) return FALLBACK_TRENDS;

    const trends = await kvClient.get<Trend[]>(KV_KEY);
    if (trends && trends.length > 0) {
      return trends;
    }
  } catch {
    // KV unavailable — use fallback
  }
  return FALLBACK_TRENDS;
}

export async function saveTrends(trends: Trend[]): Promise<void> {
  const kvClient = await getKv();
  if (!kvClient) {
    throw new Error('KV not configured');
  }
  await kvClient.set(KV_KEY, trends, { ex: TTL_SECONDS });
}
