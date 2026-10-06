import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the finished archive interface", async () => {
  const [page, archivePage, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/archivi/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Archivi in gioco/i);
  assert.match(page, /Crea o scegli un archivio/);
  assert.match(page, /Conserva nell’archivio/);
  assert.match(page, /Registro Matrimoni/);
  assert.match(page, /Elenco Oggetti/);
  assert.match(page, /Notificazione/);
  assert.match(page, /MarriageEntriesEditor/);
  assert.match(page, /type="file"/);
  assert.match(archivePage, /Modifica archivio/);
  assert.match(archivePage, /Modifica scheda/);
  assert.match(archivePage, /Elimina/);
  assert.match(layout, /Archivi in gioco/);
  assert.match(layout, /logo\.jpg/);
  assert.match(css, /@media \(max-width: 600px\)/);
  await access(new URL("../public/og.png", import.meta.url));
});
