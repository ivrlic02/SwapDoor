// Helpers for the two public Supabase Storage buckets (`avatars`,
// `house-photos`). Both follow the same path convention:
//
//     <auth.uid()>/<unique>.<ext>
//
// The first segment IS the owner's user id, and that is exactly what the
// storage RLS policies check — so a path built here can only ever land in the
// uploader's own folder.

/** A collision-proof object path inside `userId`'s folder, keeping the extension. */
export function mediaPath(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${unique}.${ext}`;
}

/**
 * The storage object path behind a public URL, or null if the URL isn't one of
 * ours. Used before deleting a replaced avatar or an unlisted home's photos, so
 * the buckets don't collect orphans. Returns null unless the file sits in
 * `userId`'s own folder — the same thing the delete policy would enforce, but
 * checked before the request rather than after the failure.
 */
export function storagePathFromUrl(
  url: string | null | undefined,
  bucket: string,
  userId: string
): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  const path = url.slice(at + marker.length);
  return path.startsWith(`${userId}/`) ? path : null;
}
