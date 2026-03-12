import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { SUPABASE_IMAGE_BUCKET } from "@/lib/config";

function extractBucketPath(storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const [bucket, ...rest] = normalized.split("/");
  return { bucket, path: rest.join("/") };
}

export async function getSignedImageUrl(storagePath: string) {
  const normalized = storagePath.replace(/^\/+/, "");
  const { bucket, path } = extractBucketPath(normalized);

  const attempts: Array<{ bucket: string; path: string }> = [];
  if (bucket && path) {
    attempts.push({ bucket, path });
  }

  // If the stored path is missing the bucket prefix (legacy), retry with configured bucket.
  if (normalized) {
    const legacyPath = normalized.startsWith(`${SUPABASE_IMAGE_BUCKET}/`)
      ? normalized.slice(SUPABASE_IMAGE_BUCKET.length + 1)
      : normalized;
    attempts.push({ bucket: SUPABASE_IMAGE_BUCKET, path: legacyPath });
  }

  for (const attempt of attempts) {
    if (!attempt.bucket || !attempt.path) {
      continue;
    }

    const { data, error } = await supabaseServerClient.storage
      .from(attempt.bucket)
      .createSignedUrl(attempt.path, 60 * 5);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

