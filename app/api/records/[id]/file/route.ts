import { env } from "cloudflare:workers";
import { ArchiveBindings, ensureArchiveSchema } from "@/db/archive-storage";

export const runtime = "edge";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const record = await bindings.DB.prepare(
    "SELECT file_key AS fileKey, file_name AS fileName, file_type AS fileType FROM archive_records WHERE id = ?",
  ).bind(id).first<{ fileKey: string; fileName: string; fileType: string }>();

  if (!record) return new Response("Documento non trovato", { status: 404 });
  const object = await bindings.ARCHIVE_FILES.get(record.fileKey);
  if (!object) return new Response("Scansione non trovata", { status: 404 });

  return new Response(object.body, { headers: {
    "Content-Type": record.fileType,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(record.fileName)}`,
    "Cache-Control": "private, max-age=3600",
  } });
}
