import { MAX_SHARE_BYTES, SHARE_TTL_MS, saveShare } from "@/lib/share-store";

export const dynamic = "force-dynamic";

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
  const id = saveShare(buf, type);
  return Response.json({ id, expiresInMinutes: Math.round(SHARE_TTL_MS / 60000) });
}
