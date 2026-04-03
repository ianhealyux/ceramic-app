import type { PublishResult } from '@/types';

/**
 * Mock Instagram publish.
 * Structure is ready for Meta Graph API integration.
 * Replace mockPublish() internals when credentials are available.
 */

interface PublishOptions {
  imageUrls: string[];
  caption?: string;
  postType: 'single' | 'carousel' | 'story';
}

export async function mockPublish(options: PublishOptions): Promise<PublishResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('[Instagram Mock] Publishing:', {
    type: options.postType,
    images: options.imageUrls.length,
    caption: options.caption?.substring(0, 50),
  });

  return {
    success: true,
    postId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
}

/**
 * Future: Real Instagram Graph API publish
 * Will use INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID env vars
 *
 * Flow for single image:
 * 1. POST /{user-id}/media — create container with image_url + caption
 * 2. POST /{user-id}/media_publish — publish the container
 *
 * Flow for carousel:
 * 1. POST /{user-id}/media for each image (is_carousel_item=true)
 * 2. POST /{user-id}/media — create carousel container with children
 * 3. POST /{user-id}/media_publish — publish
 *
 * Flow for story:
 * 1. POST /{user-id}/media — create story container
 * 2. POST /{user-id}/media_publish — publish
 */
export async function publish(options: PublishOptions): Promise<PublishResult> {
  // For now, delegate to mock
  return mockPublish(options);
}
