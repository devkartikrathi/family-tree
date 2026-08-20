import { put } from '@vercel/blob';
import { ApiError, ok, route } from '@/lib/server/api';
import { requireUserId } from '@/lib/server/auth';
import { consume, LIMITS } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

/**
 * Photographs are the reason most people build a family tree at all. Uploads go
 * to Vercel Blob when it is configured; without a token the person editor falls
 * back to pasting an image URL, so the feature degrades instead of breaking.
 */
export const POST = route(async (request) => {
  const userId = await requireUserId();
  consume(`upload:${userId}`, LIMITS.upload);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(
      501,
      'uploads_unconfigured',
      'Photo uploads need a Vercel Blob store. Paste an image URL instead, or set BLOB_READ_WRITE_TOKEN.',
    );
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) throw ApiError.invalid('Choose an image to upload.');
  if (!ALLOWED.has(file.type)) throw ApiError.invalid('Use a JPEG, PNG, WebP, AVIF or GIF image.');
  if (file.size > MAX_BYTES) {
    throw ApiError.invalid(`That image is ${(file.size / 1_048_576).toFixed(1)} MB — the limit is 6 MB.`);
  }

  const extension = file.name.split('.').pop()?.toLowerCase().slice(0, 5) || 'jpg';
  const blob = await put(`portraits/${userId}/${crypto.randomUUID()}.${extension}`, file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: false,
  });

  return ok({ url: blob.url }, 201);
});
