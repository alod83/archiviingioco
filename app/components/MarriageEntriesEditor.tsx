"use client";

export type MarriageEntry = {
  place: string;
  date: string;
  groom: string;
  bride: string;
  rabbi: string;
};

export function parseMarriageEntries(value: string | undefined): MarriageEntry[] {
  try {
    const entries = JSON.parse(value || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch { return []; }
}

export default function MarriageEntriesEditor({ entries, onChange, idPrefix = "marriage" }: {
  entries: MarriageEntry[];
  onChange: (entries: MarriageEntry[]) => void;
  idPrefix?: string;
}) {
  function update(index: number, key: keyof MarriageEntry, value: string) {
    onChange(entries.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  }

  function addEntry() {
    onChange([...entries, { place: "", date: "", groom: "", bride: "", rabbi: "" }]);
  }

  return <div className="registry-editor">
    <input type="hidden" name="registryEntries" value={JSON.stringify(entries)} />
    <div className="registry-editor-heading">
      <div><strong>Voci del registro</strong><p>Aggiungi una scheda per ogni matrimonio presente nella pagina.</p></div>
      <button type="button" onClick={addEntry}>+ Aggiungi voce</button>
    </div>
    {entries.length === 0 ? <div className="registry-empty">Non hai ancora aggiunto nessuna voce.</div> : entries.map((entry, index) => (
      <fieldset className="registry-entry" key={`${idPrefix}-${index}`}>
        <legend>Voce {index + 1}</legend>
        <button className="remove-registry-entry" type="button" onClick={() => onChange(entries.filter((_, entryIndex) => entryIndex !== index))}>Rimuovi</button>
        <div className="field-grid">
          <div className="field"><label htmlFor={`${idPrefix}-place-${index}`}>Luogo <em>*</em></label><input id={`${idPrefix}-place-${index}`} required value={entry.place} onChange={(event) => update(index, "place", event.target.value)} /></div>
          <div className="field"><label htmlFor={`${idPrefix}-date-${index}`}>Data <em>*</em></label><input id={`${idPrefix}-date-${index}`} type="date" required value={entry.date} onChange={(event) => update(index, "date", event.target.value)} /></div>
          <div className="field"><label htmlFor={`${idPrefix}-groom-${index}`}>Nome e cognome sposo <em>*</em></label><input id={`${idPrefix}-groom-${index}`} required maxLength={120} value={entry.groom} onChange={(event) => update(index, "groom", event.target.value)} /></div>
          <div className="field"><label htmlFor={`${idPrefix}-bride-${index}`}>Nome e cognome sposa <em>*</em></label><input id={`${idPrefix}-bride-${index}`} required maxLength={120} value={entry.bride} onChange={(event) => update(index, "bride", event.target.value)} /></div>
          <div className="field"><label htmlFor={`${idPrefix}-rabbi-${index}`}>Rabbino <em>*</em></label><input id={`${idPrefix}-rabbi-${index}`} required maxLength={120} value={entry.rabbi} onChange={(event) => update(index, "rabbi", event.target.value)} /></div>
        </div>
      </fieldset>
    ))}
  </div>;
}
