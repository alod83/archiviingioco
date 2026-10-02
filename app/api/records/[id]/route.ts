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

  if (!title || !author || !documentDate || !description) {
    return Response.json({ error: "Completa tutti i campi con l’asterisco." }, { status: 400 });
  }

  await ensureArchiveSchema(bindings.DB);
  const existing = await bindings.DB.prepare("SELECT id FROM archive_records WHERE id = ?").bind(id).first();
  if (!existing) return Response.json({ error: "Scheda non trovata." }, { status: 404 });

  await bindings.DB.prepare(`UPDATE archive_records SET
    title = ?, author = ?, recipient = ?, document_date = ?, place = ?, description = ?,
    document_type = ?, language = ?, condition = ?, shelfmark = ?, keywords = ?
    WHERE id = ?`)
    .bind(
      title, author, value(body, "recipient", 100), documentDate,
      value(body, "place", 100), description, value(body, "documentType", 30) || "Lettera",
      value(body, "language", 30) || "Italiano", value(body, "condition", 30) || "Buono",
      value(body, "shelfmark", 60), value(body, "keywords", 120), id,
    ).run();

  const record = await bindings.DB.prepare(`SELECT
    id, archive_id AS archiveId, title, author, recipient, document_date AS documentDate,
    place, description, document_type AS documentType, language, condition, shelfmark, keywords,
    file_name AS fileName, file_type AS fileType, created_at AS createdAt
    FROM archive_records WHERE id = ?`).bind(id).first();

  return Response.json({ record });
}
