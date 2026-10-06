"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MarriageEntriesEditor, { MarriageEntry, parseMarriageEntries } from "../../components/MarriageEntriesEditor";

type Archive = { id: string; title: string; description: string; documentCount: number; createdAt: string; updatedAt: string };
type RecordItem = {
  id: string; archiveId: string; title: string; author: string; recipient: string;
  documentDate: string; documentYear: string; place: string; documentType: string; description: string;
  language: string; condition: string; shelfmark: string; keywords: string;
  fileName: string; fileType: string; createdAt: string; registryEntries: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try { return JSON.parse(text) as T; } catch { throw new Error("Risposta non valida dal server."); }
}

function formatDate(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return [day, month, year].filter(Boolean).join("/");
}

function formatTimestamp(value: string) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(date);
}

function RecordCardFacts({ record }: { record: RecordItem }) {
  if (record.documentType === "Registro Matrimoni") return <><span><b>Voci</b>{parseMarriageEntries(record.registryEntries).length}</span><span><b>Tipologia</b>Registro</span></>;
  if (record.documentType === "Notificazione") return <><span><b>Autore</b>{record.author}</span><span><b>Data</b>{formatDate(record.documentDate)}</span></>;
  if (record.documentType === "Elenco Oggetti") return <><span><b>Destinatario</b>{record.recipient}</span><span><b>Data</b>{record.documentDate ? formatDate(record.documentDate) : record.documentYear}</span></>;
  return <><span><b>Mittente</b>{record.author}</span><span><b>Data</b>{record.documentDate ? formatDate(record.documentDate) : record.documentYear}</span></>;
}

export default function ArchivePage() {
  const { id } = useParams<{ id: string }>();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [editMarriageEntries, setEditMarriageEntries] = useState<MarriageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/archives/${id}`);
        const data = await readJson<{ archive?: Archive; records?: RecordItem[]; error?: string }>(response);
        if (!response.ok || !data.archive) throw new Error(data.error || "Archivio non trovato.");
        setArchive(data.archive);
        setRecords(data.records ?? []);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Archivio non disponibile.");
      } finally { setLoading(false); }
    }
    void load();
  }, [id]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (editingRecord) setEditingRecord(null);
      else setSelectedRecord(null);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [editingRecord]);

  async function updateArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/archives/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.get("title"), description: data.get("description") }),
      });
      const result = await readJson<{ archive?: Partial<Archive>; error?: string }>(response);
      if (!response.ok || !result.archive) throw new Error(result.error || "Modifica non riuscita.");
      setArchive((current) => current ? { ...current, ...result.archive } : current);
      setEditOpen(false); setMessage("Archivio aggiornato.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Modifica non riuscita."); }
    finally { setSaving(false); }
  }

  async function deleteArchive() {
    if (!archive || !window.confirm(`Eliminare definitivamente “${archive.title}” e tutti i suoi documenti?`)) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/archives/${id}`, { method: "DELETE" });
      const result = await readJson<{ deleted?: boolean; error?: string }>(response);
      if (!response.ok || !result.deleted) throw new Error(result.error || "Eliminazione non riuscita.");
      window.location.href = "/#archivi";
    } catch (error) { setMessage(error instanceof Error ? error.message : "Eliminazione non riuscita."); setSaving(false); }
  }

  async function updateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRecord) return;
    const data = new FormData(event.currentTarget);
    setSaving(true); setMessage("");
    try {
      const response = await fetch(`/api/records/${editingRecord.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = await readJson<{ record?: RecordItem; error?: string }>(response);
      if (!response.ok || !result.record) throw new Error(result.error || "Modifica della scheda non riuscita.");
      setRecords((current) => current.map((record) => record.id === result.record?.id ? result.record : record));
      setSelectedRecord(result.record);
      setEditingRecord(null);
      setMessage("Scheda archivistica aggiornata.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Modifica della scheda non riuscita."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="archive-page-state">Apro l’archivio…</main>;
  if (!archive) return <main className="archive-page-state"><strong>{message || "Archivio non trovato."}</strong><a href="/#archivi">Torna agli archivi</a></main>;

  return (
    <main className="archive-page">
      <header className="archive-page-topbar">
        <a className="brand" href="/" aria-label="Archivi in gioco, torna alla pagina iniziale"><span className="brand-mark" aria-hidden="true">A</span><span><strong>ARCHIVI</strong><small>IN GIOCO</small></span></a>
        <a className="back-link" href="/#archivi">← Tutti gli archivi</a>
      </header>

      <section className="archive-page-hero">
        <div><span className="archive-page-kicker">ARCHIVIO DIGITALE</span><h1>{archive.title}</h1><p>{archive.description}</p></div>
        <dl><div><dt>Documenti</dt><dd>{records.length}</dd></div><div><dt>Creato il</dt><dd>{formatTimestamp(archive.createdAt)}</dd></div></dl>
        <div className="archive-page-controls">
          <a href={`/?archive=${archive.id}#laboratorio`}>+ Aggiungi documento</a>
          <button type="button" onClick={() => setEditOpen((open) => !open)}>Modifica archivio</button>
          <button className="danger" type="button" onClick={deleteArchive} disabled={saving}>Elimina</button>
        </div>
      </section>

      {editOpen && <form className="archive-edit-form" onSubmit={updateArchive}>
        <div className="field"><label htmlFor="edit-title">Titolo</label><input id="edit-title" name="title" required maxLength={120} defaultValue={archive.title} /></div>
        <div className="field"><label htmlFor="edit-description">Descrizione</label><textarea id="edit-description" name="description" required maxLength={800} rows={4} defaultValue={archive.description} /></div>
        <div><button type="button" onClick={() => setEditOpen(false)}>Annulla</button><button type="submit" disabled={saving}>{saving ? "Salvo…" : "Salva modifiche"}</button></div>
      </form>}
      <div className="archive-page-message" role="status">{message}</div>

      <section className="archive-documents" aria-labelledby="documents-title">
        <div className="documents-heading"><div><span>INVENTARIO</span><h2 id="documents-title">Documenti conservati</h2></div><p>{records.length} {records.length === 1 ? "unità documentaria" : "unità documentarie"}</p></div>
        {records.length === 0 ? <div className="archive-page-empty"><span aria-hidden="true">✉</span><strong>Questo archivio è ancora vuoto</strong><p>Aggiungi il primo documento e crea la sua scheda.</p><a href={`/?archive=${archive.id}#laboratorio`}>Aggiungi un documento</a></div> : (
          <div className="archive-document-grid">{records.map((record, index) => (
            <button type="button" className="archive-document-card" key={record.id} onClick={() => setSelectedRecord(record)}>
              <span className="archive-document-preview">{record.fileType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/records/${record.id}/file`} alt="" />
              ) : <span className="pdf-thumb"><b>PDF</b><small>documento</small></span>}<i>{String(index + 1).padStart(2, "0")}</i></span>
              <span className="archive-document-copy"><small>{record.documentType}</small><strong>{record.title}</strong><RecordCardFacts record={record} /><em>Apri scansione e metadati →</em></span>
            </button>
          ))}</div>
        )}
      </section>

      {selectedRecord && <div className="detail-backdrop" role="presentation" onMouseDown={() => setSelectedRecord(null)}>
        <section className="record-detail" role="dialog" aria-modal="true" aria-labelledby="record-detail-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="detail-header"><div><span>SCHEDA ARCHIVISTICA</span><h2 id="record-detail-title">{selectedRecord.title}</h2><p>Unità documentaria · {selectedRecord.documentType}</p></div><div className="detail-header-actions"><button className="edit-record-button" type="button" onClick={() => { setEditingRecord(selectedRecord); setEditMarriageEntries(parseMarriageEntries(selectedRecord.registryEntries)); }}>Modifica scheda</button><button type="button" onClick={() => setSelectedRecord(null)} aria-label="Chiudi scheda">×</button></div></header>
          <div className="detail-body">
            <div className="scan-panel"><div className="scan-toolbar"><span>SCANSIONE DIGITALE</span><a href={`/api/records/${selectedRecord.id}/file`} target="_blank" rel="noreferrer">Apri a piena pagina ↗</a></div><div className="scan-viewer">{selectedRecord.fileType === "application/pdf" ? <object data={`/api/records/${selectedRecord.id}/file`} type="application/pdf" aria-label={`Scansione di ${selectedRecord.title}`}><a href={`/api/records/${selectedRecord.id}/file`}>Apri il PDF</a></object> : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/records/${selectedRecord.id}/file`} alt={`Scansione completa: ${selectedRecord.title}`} />
            )}</div><small className="file-caption">File digitale: {selectedRecord.fileName}</small></div>
            <div className="metadata-panel"><div className="metadata-intro"><span>DESCRIZIONE ARCHIVISTICA</span><p>Metadati specifici per {selectedRecord.documentType.toLowerCase()}.</p></div><dl className="metadata-list">
              <div className="metadata-wide"><dt>Titolo attribuito</dt><dd>{selectedRecord.title}</dd></div>
              <div><dt>Tipologia documentaria</dt><dd>{selectedRecord.documentType}</dd></div>
              {selectedRecord.documentType === "Lettera" && <><div><dt>Data</dt><dd>{selectedRecord.documentDate ? formatDate(selectedRecord.documentDate) : selectedRecord.documentYear || "—"}</dd></div><div><dt>Mittente</dt><dd>{selectedRecord.author}</dd></div><div><dt>Destinatario</dt><dd>{selectedRecord.recipient}</dd></div><div><dt>Luogo</dt><dd>{selectedRecord.place}</dd></div></>}
              {selectedRecord.documentType === "Notificazione" && <><div><dt>Data</dt><dd>{formatDate(selectedRecord.documentDate)}</dd></div><div><dt>Luogo</dt><dd>{selectedRecord.place}</dd></div><div><dt>Autore</dt><dd>{selectedRecord.author}</dd></div></>}
              {selectedRecord.documentType === "Elenco Oggetti" && <><div><dt>Data</dt><dd>{selectedRecord.documentDate ? formatDate(selectedRecord.documentDate) : selectedRecord.documentYear || "—"}</dd></div><div><dt>Luogo</dt><dd>{selectedRecord.place}</dd></div><div><dt>Destinatario</dt><dd>{selectedRecord.recipient}</dd></div></>}
              <div className="metadata-wide"><dt>Descrizione del contenuto</dt><dd className="description-value">{selectedRecord.description}</dd></div>
              <div><dt>Lingua</dt><dd>{selectedRecord.language || "—"}</dd></div><div><dt>Stato di conservazione</dt><dd>{selectedRecord.condition || "—"}</dd></div><div><dt>Segnatura archivistica</dt><dd>{selectedRecord.shelfmark || "—"}</dd></div><div className="metadata-wide"><dt>Parole chiave</dt><dd>{selectedRecord.keywords || "—"}</dd></div>
            </dl>
            {selectedRecord.documentType === "Registro Matrimoni" && <div className="registry-metadata"><h3>Voci del registro</h3>{parseMarriageEntries(selectedRecord.registryEntries).map((entry, index) => <article key={`${entry.date}-${index}`}><strong>Voce {index + 1}</strong><dl><div><dt>Luogo</dt><dd>{entry.place}</dd></div><div><dt>Data</dt><dd>{formatDate(entry.date)}</dd></div><div><dt>Sposo</dt><dd>{entry.groom}</dd></div><div><dt>Sposa</dt><dd>{entry.bride}</dd></div><div><dt>Rabbino</dt><dd>{entry.rabbi}</dd></div></dl></article>)}</div>}
            <div className="technical-data"><div><span>IDENTIFICATIVO UNIVOCO</span><code>{selectedRecord.id}</code></div><div><span>DATA DI INSERIMENTO</span><strong>{formatTimestamp(selectedRecord.createdAt)}</strong></div></div></div>
          </div>
        </section>
      </div>}

      {editingRecord && <div className="record-edit-backdrop" role="presentation" onMouseDown={() => setEditingRecord(null)}>
        <section className="record-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="record-edit-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="record-edit-header"><div><span>MODIFICA METADATI</span><h2 id="record-edit-title">Modifica la scheda</h2><p>La scansione originale resta invariata.</p></div><button type="button" onClick={() => setEditingRecord(null)} aria-label="Chiudi modifica">×</button></header>
          <form className="record-edit-form" onSubmit={updateRecord}>
            <input type="hidden" name="documentType" value={editingRecord.documentType} />
            <div className="field wide"><label htmlFor="record-edit-title-field">Titolo attribuito <em>*</em></label><input id="record-edit-title-field" name="title" required maxLength={120} defaultValue={editingRecord.title} /></div>
            {editingRecord.documentType === "Lettera" && <><div className="field"><label htmlFor="record-edit-author">Mittente <em>*</em></label><input id="record-edit-author" name="author" required maxLength={100} defaultValue={editingRecord.author} /></div><div className="field"><label htmlFor="record-edit-recipient">Destinatario <em>*</em></label><input id="record-edit-recipient" name="recipient" required maxLength={100} defaultValue={editingRecord.recipient} /></div><div className="field"><label htmlFor="record-edit-place">Luogo <em>*</em></label><input id="record-edit-place" name="place" required maxLength={100} defaultValue={editingRecord.place} /></div><div className="field"><label htmlFor="record-edit-date">Data <em>*</em></label><input id="record-edit-date" name="documentDate" type="date" required defaultValue={editingRecord.documentDate} /></div></>}
            {editingRecord.documentType === "Notificazione" && <><div className="field"><label htmlFor="record-edit-place">Luogo <em>*</em></label><input id="record-edit-place" name="place" required maxLength={100} defaultValue={editingRecord.place} /></div><div className="field"><label htmlFor="record-edit-date">Data <em>*</em></label><input id="record-edit-date" name="documentDate" type="date" required defaultValue={editingRecord.documentDate} /></div><div className="field"><label htmlFor="record-edit-author">Autore <em>*</em></label><input id="record-edit-author" name="author" required maxLength={100} defaultValue={editingRecord.author} /></div></>}
            {editingRecord.documentType === "Elenco Oggetti" && <><div className="field"><label htmlFor="record-edit-date">Data <em>*</em></label><input id="record-edit-date" name="documentDate" type="date" required defaultValue={editingRecord.documentDate} /></div><div className="field"><label htmlFor="record-edit-place">Luogo <em>*</em></label><input id="record-edit-place" name="place" required maxLength={100} defaultValue={editingRecord.place} /></div><div className="field"><label htmlFor="record-edit-recipient">Destinatario <em>*</em></label><input id="record-edit-recipient" name="recipient" required maxLength={100} defaultValue={editingRecord.recipient} /></div></>}
            <div className="field wide"><label htmlFor="record-edit-description">Descrizione del contenuto <em>*</em></label><textarea id="record-edit-description" name="description" required maxLength={500} rows={5} defaultValue={editingRecord.description} /></div>
            {editingRecord.documentType === "Registro Matrimoni" && <div className="wide"><MarriageEntriesEditor idPrefix="edit-marriage" entries={editMarriageEntries} onChange={setEditMarriageEntries} /></div>}
            <div className="field"><label>Tipologia documentaria</label><input value={editingRecord.documentType} disabled /></div>
            <div className="field"><label htmlFor="record-edit-language">Lingua</label><select id="record-edit-language" name="language" defaultValue={editingRecord.language}><option>Italiano</option><option>Francese</option><option>Inglese</option><option>Latino</option><option>Altra</option></select></div>
            <div className="field"><label htmlFor="record-edit-condition">Stato di conservazione</label><select id="record-edit-condition" name="condition" defaultValue={editingRecord.condition}><option>Ottimo</option><option>Buono</option><option>Fragile</option><option>Danneggiato</option></select></div>
            <div className="field"><label htmlFor="record-edit-shelfmark">Segnatura archivistica</label><input id="record-edit-shelfmark" name="shelfmark" maxLength={60} defaultValue={editingRecord.shelfmark} /></div>
            <div className="field wide"><label htmlFor="record-edit-keywords">Parole chiave</label><input id="record-edit-keywords" name="keywords" maxLength={120} defaultValue={editingRecord.keywords} /></div>
            <div className="record-edit-actions"><button type="button" onClick={() => setEditingRecord(null)}>Annulla</button><button type="submit" disabled={saving}>{saving ? "Salvo…" : "Salva modifiche"}</button></div>
          </form>
        </section>
      </div>}
    </main>
  );
}
