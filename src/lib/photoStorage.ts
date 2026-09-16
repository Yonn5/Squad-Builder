import { base64ToBytes } from "./binary";
import { PHOTO_BUCKET, type PhotoData } from "./photo";
import { supabase } from "./supabase";

const PUBLIC_PREFIX = `/storage/v1/object/public/${PHOTO_BUCKET}/`;

/** The object path inside the bucket, or null for anything else. */
function pathInBucket(url: string | null | undefined): string | null {
  if (!url) return null;
  const at = url.indexOf(PUBLIC_PREFIX);
  if (at < 0) return null;
  const path = url.slice(at + PUBLIC_PREFIX.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

/**
 * Stores the photo under the player's own folder and returns its public URL.
 * Every upload gets a fresh name so cards never show a cached older photo.
 */
export async function uploadPlayerPhoto(
  userId: string,
  photo: PhotoData,
): Promise<string> {
  const bytes = base64ToBytes(photo.base64);
  const extension = photo.mime === "image/png" ? "png" : "jpg";
  // The card needs to know whether a photo is a cut-out to lay it out, and
  // the URL is all it gets back from the database, so it is marked here.
  const marker = photo.cutOut ? "-cut" : "";
  const path = `${userId}/${Date.now()}${marker}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes.buffer as ArrayBuffer, {
      contentType: photo.mime,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw error;

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort clean-up of a photo this player has replaced or cleared. */
export async function deletePlayerPhoto(
  url: string | null | undefined,
): Promise<void> {
  const path = pathInBucket(url);
  if (!path) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** Reads back the marker {@link uploadPlayerPhoto} writes into the name. */
export function isCutOutUrl(url: string | null | undefined): boolean {
  return !!url && /-cut\.(png|jpg)(\?|$)/.test(url);
}
