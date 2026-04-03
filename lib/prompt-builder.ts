/**
 * Combines user description (Spanish) + trend prompt (English)
 * into a technical prompt for Stable Diffusion.
 * The user never sees this combined prompt.
 */
export function buildPrompt(
  description: string,
  trendPrompt: string
): string {
  // Extract key descriptors from user's Spanish description
  // and integrate with the trend's scene prompt
  const pieceDescription = description.trim();

  if (!pieceDescription && !trendPrompt) {
    return 'handmade ceramic piece on a neutral surface, soft natural lighting, professional product photography';
  }

  if (!pieceDescription) {
    return `handmade ceramic piece, ${trendPrompt}, professional product photography`;
  }

  if (!trendPrompt) {
    return `${pieceDescription}, neutral background, soft natural lighting, professional product photography`;
  }

  return `${pieceDescription}, ${trendPrompt}, professional product photography`;
}

/**
 * Builds the lighting prompt for IC-Light relighting step.
 * Extracts lighting cues from the trend prompt.
 */
export function buildLightingPrompt(trendPrompt: string): string {
  // Extract lighting keywords from trend prompt or use default
  const lightingKeywords = [
    'light', 'lighting', 'sun', 'golden hour', 'morning',
    'afternoon', 'shadow', 'dappled', 'diffused', 'overhead',
  ];

  const words = trendPrompt.toLowerCase();
  const hasLighting = lightingKeywords.some((kw) => words.includes(kw));

  if (hasLighting) {
    return `professional product lighting matching scene: ${trendPrompt}`;
  }

  return 'soft natural side lighting, gentle shadows, professional product photography';
}
