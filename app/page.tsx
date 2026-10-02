"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

type RecordItem = {
  id: string;
  title: string;
  author: string;
  recipient: string;
  documentDate: string;
  place: string;
  documentType: string;
  description: string;
  language: string;
  condition: string;
  shelfmark: string;
  keywords: string;
  fileName: string;
  fileType: string;
  createdAt: string;
};

type ArchiveItem = {
  id: string;
  title: string;
  description: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;

async function readApiResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as T;
  } catch {
    if (response.status === 413) {
      throw new Error("La scansione è troppo grande. Scegli un file sotto i 15 MB.");
    }
    throw new Error(response.ok ? "Risposta non valida dal server." : "Il salvataggio non è riuscito. Riprova.");
  }
}

function formatDate(value: string) {
  if (!value) return "Data sconosciuta";
  const [year, month, day] = value.split("-");
  return [day, month, year].filter(Boolean).join("/");
}

function formatTimestamp(value: string) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(true);
  const [archiveFormOpen, setArchiveFormOpen] = useState(false);
  const [archiveMessage, setArchiveMessage] = useState("");
  const [creatingArchive, setCreatingArchive] = useState(false);
  const [activeArchiveId, setActiveArchiveId] = useState("");
  const activeArchive = archives.find((archive) => archive.id === activeArchiveId) ?? null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => { void loadArchives(); }, []);

  function chooseFile(nextFile: File | null) {
    setMessage("");
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_SIZE) {
      setMessage("Il file è troppo grande. Scegline uno sotto i 15 MB.");
      return;
    }
    if (![/^image\//, /^application\/pdf$/].some((rule) => rule.test(nextFile.type))) {
      setMessage("Formato non riconosciuto. Usa JPG, PNG, WEBP o PDF.");
      return;
    }
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  async function loadArchives() {
    setArchivesLoading(true);
    try {
      const response = await fetch("/api/archives");
      const data = await readApiResponse<{ archives: ArchiveItem[]; error?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Archivi non disponibili");
      setArchives(data.archives);
      const requestedArchive = new URLSearchParams(window.location.search).get("archive");
      if (requestedArchive && data.archives.some((archive) => archive.id === requestedArchive)) setActiveArchiveId(requestedArchive);
    } catch {
      setArchiveMessage("Non riesco a caricare gli archivi. Riprova tra poco.");
    } finally {
      setArchivesLoading(false);
    }
  }

  async function createArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setArchiveMessage("");
    setCreatingArchive(true);
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.get("archiveTitle"), description: formData.get("archiveDescription") }),
      });
      const result = await readApiResponse<{ archive?: ArchiveItem; error?: string }>(response);
      if (!response.ok || !result.archive) throw new Error(result.error || "Creazione non riuscita");
      setArchives((current) => [result.archive!, ...current]);
      setActiveArchiveId(result.archive.id);
      setArchiveFormOpen(false);
      setArchiveMessage("Archivio creato. Ora puoi aggiungere il primo documento.");
      form.reset();
      window.setTimeout(() => document.getElementById("laboratorio")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      setArchiveMessage(error instanceof Error ? error.message : "Creazione non riuscita.");
    } finally {
      setCreatingArchive(false);
    }
  }

  function chooseArchive(id: string) {
    setActiveArchiveId(id);
    window.setTimeout(() => document.getElementById("laboratorio")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!activeArchiveId) {
      setMessage("Prima crea o seleziona un archivio.");
      return;
    }
    if (!file) {
      setMessage("Prima aggiungi la scansione della lettera.");
      fileRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const body = new FormData(event.currentTarget);
      body.set("scan", file);
      body.set("archiveId", activeArchiveId);
      const response = await fetch("/api/records", { method: "POST", body });
      const result = await readApiResponse<{ record?: RecordItem; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Salvataggio non riuscito");

      setArchives((current) => current.map((archive) => archive.id === activeArchiveId ? { ...archive, documentCount: Number(archive.documentCount) + 1 } : archive));
      setMessage("Missione compiuta! La lettera è entrata nell’archivio.");
      formRef.current?.reset();
      setFile(null);
      setPreview(null);
      setDescriptionLength(0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Qualcosa non ha funzionato. Riprova.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#inizio" aria-label="Archivi in gioco, torna all'inizio">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span><strong>ARCHIVI</strong><small>IN GIOCO</small></span>
        </a>
        <a className="archive-button" href="#archivi">
          <span aria-hidden="true">▣</span> Vedi gli archivi
        </a>
      </header>

      <section className="hero" id="inizio">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="eyebrow"><span aria-hidden="true">✦</span> LABORATORIO INTERATTIVO</div>
            <h1>Archivi<br /><span>in gioco</span></h1>
            <p className="hero-tagline">Esplorare, digitalizzare, condividere</p>
            <p className="hero-lead">Un laboratorio per scoprire come il patrimonio culturale prende nuova vita grazie al digitale.</p>
            <a className="hero-cta" href="#laboratorio">Inizia il laboratorio <span aria-hidden="true">↓</span></a>
          </div>
          <figure className="hero-visual">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Ragazze e ragazzi esplorano lettere storiche, le digitalizzano e le catalogano al computer" />
          </figure>
        </div>
      </section>

      <section className="project-story" aria-labelledby="project-title">
        <div className="story-heading">
          <div className="eyebrow"><span aria-hidden="true">✦</span> IL PROGETTO</div>
          <h2 id="project-title">Dalle mani allo schermo,<br />la storia continua.</h2>
        </div>
        <div className="story-copy">
          <p className="story-lead">Partendo da lettere manoscritte e documenti storici, i partecipanti esploreranno il loro contesto e impareranno a manipolarli come avveniva in passato, piegandoli e richiudendoli secondo gli usi originali.</p>
          <p>Attraverso scanner e strumenti digitali, i documenti saranno poi trasformati in copie digitali, catalogati con metadati e pubblicati online su un piccolo sito web.</p>
          <p>Un’esperienza coinvolgente che unisce storia, manualità e innovazione per avvicinare i più giovani al mondo degli archivi e della conservazione digitale.</p>
        </div>
        <ol className="project-path" aria-label="Le tre fasi dell’esperienza">
          <li><span>01</span><div><strong>Esplorare</strong><small>Osserva gli indizi e scopri il contesto storico.</small></div></li>
          <li><span>02</span><div><strong>Digitalizzare</strong><small>Trasforma il documento in una copia digitale.</small></div></li>
          <li><span>03</span><div><strong>Condividere</strong><small>Descrivi, cataloga e pubblica nell’archivio.</small></div></li>
        </ol>
      </section>

      <section className="archive-setup" id="archivi" aria-labelledby="archives-title">
        <div className="archive-setup-header">
          <div><span>PRIMO PASSO</span><h2 id="archives-title">Crea o scegli un archivio</h2><p>Ogni documento deve appartenere a un archivio con un titolo e una descrizione.</p></div>
          <button type="button" onClick={() => setArchiveFormOpen((open) => !open)}>{archiveFormOpen ? "Annulla" : "+ Nuovo archivio"}</button>
        </div>

        {archiveFormOpen && (
          <form className="new-archive-form" onSubmit={createArchive}>
            <div className="field"><label htmlFor="archiveTitle">Titolo dell’archivio <em>*</em></label><input id="archiveTitle" name="archiveTitle" required maxLength={120} placeholder="Es. Lettere della famiglia Rossi" /></div>
            <div className="field"><label htmlFor="archiveDescription">Descrizione dell’archivio <em>*</em></label><textarea id="archiveDescription" name="archiveDescription" required maxLength={800} rows={4} placeholder="Racconta quali documenti contiene, da dove provengono e a quale periodo appartengono." /></div>
            <button className="create-archive-button" type="submit" disabled={creatingArchive}>{creatingArchive ? "Sto creando…" : "Crea l’archivio"} <span aria-hidden="true">→</span></button>
          </form>
        )}

        <div className="archive-feedback" role="status">{archiveMessage}</div>
        {archivesLoading ? <p className="archive-loading">Cerco gli archivi disponibili…</p> : archives.length === 0 ? (
          <div className="no-archives"><span aria-hidden="true">□</span><div><strong>Non ci sono ancora archivi</strong><p>Creane uno per iniziare a catalogare i documenti.</p></div></div>
        ) : (
          <div className="archive-grid">
            {archives.map((archive) => (
              <article className={`archive-choice ${archive.id === activeArchiveId ? "selected" : ""}`} key={archive.id}>
                <div className="archive-folder" aria-hidden="true"><span>{Number(archive.documentCount) || 0}</span><small>documenti</small></div>
                <div className="archive-choice-copy"><span>ARCHIVIO</span><h3>{archive.title}</h3><p>{archive.description}</p></div>
                <div className="archive-actions">
                  <button type="button" onClick={() => chooseArchive(archive.id)}>{archive.id === activeArchiveId ? "Selezionato ✓" : "Aggiungi documenti"}</button>
                  <a href={`/archivi/${archive.id}`}>Apri la pagina →</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activeArchive ? <>
        <div className="lab-intro" id="laboratorio">
          <span>ARCHIVIO SELEZIONATO · {activeArchive.title}</span>
          <h2>Crea una nuova scheda</h2>
          <p>Scansiona il documento e raccogli con cura tutte le informazioni.</p>
        </div>

      <form className="workspace" ref={formRef} onSubmit={submitRecord}>
        <section className="scan-column" aria-labelledby="scan-title">
          <div className="section-heading">
            <span className="section-number">01</span>
            <div><h2 id="scan-title">La scansione</h2><p>Carica una foto nitida o un PDF.</p></div>
          </div>

          <div
            className={`upload-card ${preview ? "has-preview" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0] ?? null); }}
          >
            {preview ? (
              <div className="document-preview">
                {file?.type === "application/pdf" ? (
                  <div className="pdf-preview"><span>PDF</span><strong>{file.name}</strong><small>Documento pronto</small></div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Anteprima del documento scansionato" />
                )}
                <button className="replace-file" type="button" onClick={() => fileRef.current?.click()}>Cambia file</button>
              </div>
            ) : (
              <div className="upload-empty">
                <div className="letter-stack" aria-hidden="true"><span>✎</span></div>
                <h3>Porta qui la tua lettera</h3>
                <p>Trascina la scansione in questo spazio</p>
                <span className="or"><i /> oppure <i /></span>
                <button type="button" onClick={() => fileRef.current?.click()}>Scegli il file</button>
                <small>JPG, PNG, WEBP o PDF · massimo 15 MB</small>
              </div>
            )}
            <input ref={fileRef} className="visually-hidden" type="file" name="scan" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onFileChange} />
          </div>

          <aside className="detective-tip">
            <span aria-hidden="true">⌕</span>
            <div><strong>OCCHIO DA DETECTIVE!</strong><p>La scrittura è ben visibile? Controlla che non ci siano ombre o parti tagliate.</p></div>
          </aside>
        </section>

        <section className="data-column" aria-labelledby="data-title">
          <div className="section-heading">
            <span className="section-number coral">02</span>
            <div><h2 id="data-title">La carta d’identità</h2><p>Osserva la lettera e raccogli tutti gli indizi.</p></div>
          </div>

          <div className="form-card">
            <div className="field full">
              <label htmlFor="title">Titolo della lettera <em>*</em></label>
              <input id="title" name="title" required maxLength={120} placeholder="Es. Lettera di Giovanni a sua sorella" />
              <small>Inventa un titolo breve che aiuti a riconoscerla.</small>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="author">Nome e cognome del mittente <em>*</em></label>
                <input id="author" name="author" required maxLength={100} placeholder="Es. Giovanni Rossi" />
              </div>
              <div className="field">
                <label htmlFor="recipient">Nome e cognome del destinatario</label>
                <input id="recipient" name="recipient" maxLength={100} placeholder="Es. Maria Bianchi" />
              </div>
              <div className="field">
                <label htmlFor="documentDate">Quando? <em>*</em></label>
                <input id="documentDate" name="documentDate" required type="date" />
              </div>
              <div className="field">
                <label htmlFor="place">Da dove?</label>
                <input id="place" name="place" maxLength={100} placeholder="Città o luogo" />
              </div>
            </div>

            <div className="field full">
              <label htmlFor="description">Che cosa racconta? <em>*</em></label>
              <textarea id="description" name="description" required maxLength={500} rows={5} onChange={(event) => setDescriptionLength(event.target.value.length)} placeholder="Riassumi la lettera con parole tue: di cosa parla? Quali persone, luoghi o fatti nomina?" />
              <small className="counter">{descriptionLength} / 500</small>
            </div>

            <div className="field-grid three">
              <div className="field">
                <label htmlFor="documentType">Tipo</label>
                <select id="documentType" name="documentType" defaultValue="Lettera">
                  <option>Lettera</option><option>Cartolina</option><option>Biglietto</option><option>Telegramma</option><option>Altro</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="language">Lingua</label>
                <select id="language" name="language" defaultValue="Italiano">
                  <option>Italiano</option><option>Francese</option><option>Inglese</option><option>Latino</option><option>Altra</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="condition">Stato</label>
                <select id="condition" name="condition" defaultValue="Buono">
                  <option>Ottimo</option><option>Buono</option><option>Fragile</option><option>Danneggiato</option>
                </select>
              </div>
            </div>

            <details className="extra-fields">
              <summary>+ Aggiungi altri indizi</summary>
              <div className="field-grid extra-grid">
                <div className="field"><label htmlFor="shelfmark">Segnatura</label><input id="shelfmark" name="shelfmark" maxLength={60} placeholder="Es. Fondo Rossi, b. 3" /></div>
                <div className="field"><label htmlFor="keywords">Parole chiave</label><input id="keywords" name="keywords" maxLength={120} placeholder="famiglia, viaggio, scuola..." /></div>
              </div>
            </details>
          </div>

          <div className="submit-row">
            <div className={`status-message ${message.includes("Missione") ? "success" : ""}`} role="status">{message}</div>
            <button className="save-button" type="submit" disabled={saving}>
              {saving ? "Sto conservando…" : "Conserva nell’archivio"} <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </form>
      </> : (
        <section className="lab-locked" id="laboratorio">
          <span aria-hidden="true">↟</span>
          <div><strong>Prima scegli dove conservare i documenti</strong><p>Crea un nuovo archivio oppure selezionane uno dall’elenco qui sopra.</p></div>
        </section>
      )}

      <footer><span>✦</span><p>Archivi in gioco · Esplorare, digitalizzare, condividere.</p><span>✦</span></footer>

    </main>
  );
}
