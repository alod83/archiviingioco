import { env } from "cloudflare:workers";
import { ArchiveBindings, ensureArchiveSchema } from "@/db/archive-storage";

export const runtime = "edge";

async function archiveId(context: { params: Promise<{ id: string }> }) {
  return (await context.params).id;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await archiveId(context);
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const archive = await bindings.DB.prepare(`SELECT id, title, description,
    created_at AS createdAt, updated_at AS updatedAt FROM archives WHERE id = ?`).bind(id).first();
  if (!archive) return Response.json({ error: "Archivio non trovato." }, { status: 404 });
  const records = await bindings.DB.prepare(`SELECT
    id, archive_id AS archiveId, title, author, recipient, document_date AS documentDate,
    document_year AS documentYear, registry_entries AS registryEntries,
    place, description, document_type AS documentType, language, condition,
    shelfmark, keywords, file_name AS fileName, file_type AS fileType,
    created_at AS createdAt FROM archive_records
    WHERE archive_id = ? ORDER BY created_at DESC`).bind(id).all();
  return Response.json({ archive: { ...archive, documentCount: records.results?.length ?? 0 }, records: records.results ?? [] });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await archiveId(context);
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const body = await request.json<{ title?: string; description?: string }>();
  const title = String(body.title ?? "").trim().slice(0, 120);
  const description = String(body.description ?? "").trim().slice(0, 800);
  if (!title || !description) return Response.json({ error: "Inserisci titolo e descrizione dell’archivio." }, { status: 400 });
  const now = new Date().toISOString();
  const result = await bindings.DB.prepare("UPDATE archives SET title = ?, description = ?, updated_at = ? WHERE id = ?")
    .bind(title, description, now, id).run();
  if (!result.meta.changes) return Response.json({ error: "Archivio non trovato." }, { status: 404 });
  return Response.json({ archive: { id, title, description, updatedAt: now } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = await archiveId(context);
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const files = await bindings.DB.prepare("SELECT file_key AS fileKey FROM archive_records WHERE archive_id = ?")
    .bind(id).all<{ fileKey: string }>();
  const keys = (files.results ?? []).map((file) => file.fileKey);
  if (keys.length) await bindings.ARCHIVE_FILES.delete(keys);
  const result = await bindings.DB.batch([
    bindings.DB.prepare("DELETE FROM archive_records WHERE archive_id = ?").bind(id),
    bindings.DB.prepare("DELETE FROM archives WHERE id = ?").bind(id),
  ]);
  if (!result[1]?.meta.changes) return Response.json({ error: "Archivio non trovato." }, { status: 404 });
  return Response.json({ deleted: true });
}
