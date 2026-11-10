import { getShare } from "@/lib/share-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entry = getShare(id);
  if (!entry) {
    return new Response("Link sudah kedaluwarsa.", { status: 404 });
  }
  const download = new URL(request.url).searchParams.get("download") === "1";
  const ext = entry.type === "image/jpeg" ? "jpg" : "png";
  return new Response(new Uint8Array(entry.data), {
    headers: {
      "Content-Type": entry.type,
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="tribiz-fest-photobooth.${ext}"`,
    },
  });
}
