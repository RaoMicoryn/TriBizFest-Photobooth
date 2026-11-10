import { MAX_SHARE_BYTES, SHARE_TTL_MS, saveShare } from "@/lib/share-store";

/**
 * Stores the finished photo so a QR code can point at it.
 *
 * - On Vercel (or anywhere BLOB_READ_WRITE_TOKEN is set): Vercel Blob, which
 *   survives across serverless instances.
 * - Otherwise: a short-lived in-memory store (fine for `next dev` / a Node
 *   server, NOT reliable on serverless).
 *
 * Note: no `export const dynamic` here, it is incompatible with
 * `cacheComponents`; POST handlers are always dynamic anyway.
 */

function sniff(buf: Buffer): "image/png" | "image/jpeg" | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

export async function POST(request: Request) {
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length) {
    return Response.json({ error: "Gambar kosong." }, { status: 400 });
  }
  if (buf.length > MAX_SHARE_BYTES) {
    return Response.json({ error: "Gambar terlalu besar." }, { status: 413 });
  }
  const type = sniff(buf);
  if (!type) {
    return Response.json({ error: "Format harus PNG atau JPEG." }, { status: 415 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const ext = type === "image/jpeg" ? "jpg" : "png";
      const blob = await put(`photobooth/tribiz-fest.${ext}`, buf, {
        access: "public",
        addRandomSuffix: true,
        contentType: type,
      });
      const src = encodeURIComponent(blob.url);
      return Response.json({ path: `/s/b?src=${src}` });
    } catch (err) {
      console.error("Blob upload failed", err);
      return Response.json({ error: "Upload gagal." }, { status: 502 });
    }
  }

  const id = saveShare(buf, type);
  return Response.json({
    path: `/s/${id}`,
    expiresInMinutes: Math.round(SHARE_TTL_MS / 60000),
  });
}
