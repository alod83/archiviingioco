import { env } from "cloudflare:workers";
import { ArchiveBindings, ensureArchiveSchema } from "@/db/archive-storage";

export const runtime = "edge";

export async function GET() {
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const result = await bindings.DB.prepare(`SELECT
    a.id, a.title, a.description, a.created_at AS createdAt, a.updated_at AS updatedAt,
    COUNT(r.id) AS documentCount
    FROM archives a LEFT JOIN archive_records r ON r.archive_id = a.id
    GROUP BY a.id ORDER BY a.updated_at DESC`).all();
  return Response.json({ archives: result.results ?? [] });
}

export async function POST(request: Request) {
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const body = await request.json<{ title?: string; description?: string }>();
  const title = String(body.title ?? "").trim().slice(0, 120);
  const description = String(body.description ?? "").trim().slice(0, 800);
  if (!title || !description) return Response.json({ error: "Inserisci titolo e descrizione dell’archivio." }, { status: 400 });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await bindings.DB.prepare(`INSERT INTO archives (id, title, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)`)
    .bind(id, title, description, now, now).run();
  return Response.json({ archive: { id, title, description, documentCount: 0, createdAt: now, updatedAt: now } }, { status: 201 });
}
