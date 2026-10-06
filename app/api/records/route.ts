import { env } from "cloudflare:workers";
import { ArchiveBindings, ensureArchiveSchema } from "@/db/archive-storage";

export const runtime = "edge";

function value(form: FormData, key: string, maxLength: number) {
  return String(form.get(key) ?? "").trim().slice(0, maxLength);
}

const documentTypes = new Set(["Lettera", "Notificazione", "Elenco Oggetti", "Registro Matrimoni"]);

type RegistryEntry = { place: string; date: string; groom: string; bride: string; rabbi: string };

function registryEntries(form: FormData): RegistryEntry[] {
  try {
    const parsed = JSON.parse(value(form, "registryEntries", 12000)) as Partial<RegistryEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 100).map((entry) => ({
      place: String(entry.place ?? "").trim().slice(0, 100),
      date: String(entry.date ?? "").trim().slice(0, 10),
      groom: String(entry.groom ?? "").trim().slice(0, 120),
      bride: String(entry.bride ?? "").trim().slice(0, 120),
      rabbi: String(entry.rabbi ?? "").trim().slice(0, 120),
    }));
  } catch { return []; }
}

export async function GET(request: Request) {
  const bindings = env as unknown as ArchiveBindings;
  await ensureArchiveSchema(bindings.DB);
  const archiveId = new URL(request.url).searchParams.get("archiveId");
  const where = archiveId ? "WHERE archive_id = ?" : "";
  const result = await bindings.DB.prepare(`SELECT
    id, archive_id AS archiveId, title, author, recipient, document_date AS documentDate,
    document_year AS documentYear, registry_entries AS registryEntries,
    place, description, document_type AS documentType,
    language, condition, shelfmark, keywords,
    file_name AS fileName, file_type AS fileType, created_at AS createdAt
    FROM archive_records ${where} ORDER BY created_at DESC LIMIT 100`)
    .bind(...(archiveId ? [archiveId] : [])).all();
  return Response.json({ records: result.results ?? [] });
}

export async function POST(request: Request) {
  const bindings = env as unknown as ArchiveBindings;
  const form = await request.formData();
  const scan = form.get("scan");
  const title = value(form, "title", 120);
  const author = value(form, "author", 100);
  const documentDate = value(form, "documentDate", 10);
  const documentYear = value(form, "documentYear", 4);
  const description = value(form, "description", 500);
  const archiveId = value(form, "archiveId", 80);
  const documentType = value(form, "documentType", 30) || "Lettera";
  const entries = registryEntries(form);

  if (!(scan instanceof File) || scan.size === 0) return Response.json({ error: "Aggiungi la scansione del documento." }, { status: 400 });
  if (!archiveId) return Response.json({ error: "Prima scegli o crea un archivio." }, { status: 400 });
  if (!documentTypes.has(documentType)) return Response.json({ error: "Scegli una tipologia di documento valida." }, { status: 400 });
  if (!title || !description) return Response.json({ error: "Inserisci titolo e descrizione." }, { status: 400 });
  if (documentType === "Lettera" && (!author || !value(form, "recipient", 100) || !value(form, "place", 100) || !documentDate)) return Response.json({ error: "Completa tutti i metadati della lettera." }, { status: 400 });
  if (documentType === "Notificazione" && (!author || !value(form, "place", 100) || !documentDate)) return Response.json({ error: "Completa tutti i metadati della notificazione." }, { status: 400 });
  if (documentType === "Elenco Oggetti" && (!value(form, "recipient", 100) || !value(form, "place", 100) || !documentDate)) return Response.json({ error: "Completa tutti i metadati dell’elenco oggetti." }, { status: 400 });
  if (documentType === "Registro Matrimoni" && (!entries.length || entries.some((entry) => !entry.place || !entry.date || !entry.groom || !entry.bride || !entry.rabbi))) return Response.json({ error: "Aggiungi almeno una voce completa del registro matrimoni." }, { status: 400 });
  if (scan.size > 15 * 1024 * 1024) return Response.json({ error: "Il file supera il limite di 15 MB." }, { status: 413 });

  const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  if (!acceptedTypes.has(scan.type)) return Response.json({ error: "Il formato del file non è supportato." }, { status: 415 });

  await ensureArchiveSchema(bindings.DB);
  const archive = await bindings.DB.prepare("SELECT id FROM archives WHERE id = ?").bind(archiveId).first();
  if (!archive) return Response.json({ error: "L’archivio selezionato non esiste più." }, { status: 404 });
  const id = crypto.randomUUID();
  const extension = scan.name.includes(".") ? scan.name.split(".").pop()?.toLowerCase() : "bin";
  const fileKey = `documents/${id}.${extension}`;

  await bindings.ARCHIVE_FILES.put(fileKey, scan.stream(), {
    httpMetadata: { contentType: scan.type },
    customMetadata: { originalName: scan.name },
  });

  try {
    await bindings.DB.prepare(`INSERT INTO archive_records (
      id, archive_id, title, author, recipient, document_date, document_year, place, description,
      document_type, language, condition, shelfmark, keywords, registry_entries,
      file_key, file_name, file_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        id, archiveId, title, author, value(form, "recipient", 100), documentDate, documentYear,
        value(form, "place", 100), description, documentType,
        value(form, "language", 30) || "Italiano", value(form, "condition", 30) || "Buono",
        value(form, "shelfmark", 60), value(form, "keywords", 120), JSON.stringify(entries),
        fileKey, scan.name.slice(0, 180), scan.type,
      ).run();
  } catch (error) {
    await bindings.ARCHIVE_FILES.delete(fileKey);
    throw error;
  }

  return Response.json({ record: {
    id, archiveId, title, author, recipient: value(form, "recipient", 100), documentDate, documentYear,
    place: value(form, "place", 100), description,
    documentType, registryEntries: JSON.stringify(entries),
    language: value(form, "language", 30) || "Italiano",
    condition: value(form, "condition", 30) || "Buono",
    shelfmark: value(form, "shelfmark", 60), keywords: value(form, "keywords", 120),
    fileName: scan.name.slice(0, 180), fileType: scan.type, createdAt: new Date().toISOString(),
  } }, { status: 201 });
}
