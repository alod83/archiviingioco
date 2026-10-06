import { env } from "cloudflare:workers";
import { ArchiveBindings, ensureArchiveSchema } from "@/db/archive-storage";

export const runtime = "edge";

function value(body: Record<string, unknown>, key: string, maxLength: number) {
  return String(body[key] ?? "").trim().slice(0, maxLength);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bindings = env as unknown as ArchiveBindings;
  const body = await request.json<Record<string, unknown>>();
  const title = value(body, "title", 120);
  const author = value(body, "author", 100);
  const documentDate = value(body, "documentDate", 10);
  const description = value(body, "description", 500);
  const documentType = value(body, "documentType", 30) || "Lettera";

  if (!title || !description) {
    return Response.json({ error: "Inserisci titolo e descrizione." }, { status: 400 });
  }

  await ensureArchiveSchema(bindings.DB);
  const existing = await bindings.DB.prepare("SELECT id, document_year AS documentYear, registry_entries AS registryEntries FROM archive_records WHERE id = ?").bind(id).first<{ id: string; documentYear: string; registryEntries: string }>();
  if (!existing) return Response.json({ error: "Scheda non trovata." }, { status: 404 });

  await bindings.DB.prepare(`UPDATE archive_records SET
    title = ?, author = ?, recipient = ?, document_date = ?, place = ?, description = ?,
    document_type = ?, language = ?, condition = ?, shelfmark = ?, keywords = ?,
    document_year = ?, registry_entries = ?
    WHERE id = ?`)
    .bind(
      title, author, value(body, "recipient", 100), documentDate,
      value(body, "place", 100), description, documentType,
      value(body, "language", 30) || "Italiano", value(body, "condition", 30) || "Buono",
      value(body, "shelfmark", 60), value(body, "keywords", 120),
      body.documentYear === undefined ? existing.documentYear : value(body, "documentYear", 4),
      body.registryEntries === undefined ? existing.registryEntries : value(body, "registryEntries", 12000), id,
    ).run();

  const record = await bindings.DB.prepare(`SELECT
    id, archive_id AS archiveId, title, author, recipient, document_date AS documentDate,
    document_year AS documentYear, registry_entries AS registryEntries,
    place, description, document_type AS documentType, language, condition, shelfmark, keywords,
    file_name AS fileName, file_type AS fileType, created_at AS createdAt
    FROM archive_records WHERE id = ?`).bind(id).first();

  return Response.json({ record });
}
