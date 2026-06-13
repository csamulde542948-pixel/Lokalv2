import { getSessionCsrfToken } from "./auth-session-cookie";
import { BACKEND_URL } from "./env";
import { supabase } from "./supabase";

type UploadBucket = "avatars" | "covers" | "post-images" | "post-videos";

interface SignedUploadOptions {
  bucket: UploadBucket;
  path: string;
  file: File;
  upsert?: boolean;
  cacheControl?: string;
}

export async function uploadPublicFile({
  bucket,
  path,
  file,
  upsert = false,
  cacheControl = "3600",
}: SignedUploadOptions): Promise<string> {
  const csrfToken = getSessionCsrfToken();
  if (!csrfToken) {
    throw new Error("Your secure session is not ready. Refresh the page and try again.");
  }

  const response = await fetch(`${BACKEND_URL}/storage/signed-upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      bucket,
      path,
      contentType: file.type,
      size: file.size,
      upsert,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.token) {
    throw new Error(payload?.error ?? "Could not prepare file upload.");
  }

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, payload.token, file, {
      cacheControl,
      contentType: file.type,
    });
  if (error) throw error;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
