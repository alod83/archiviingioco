# Archivi in gioco

Applicazione per creare archivi digitali, catalogare lettere e documenti storici e conservarne le scansioni.

Il progetto è predisposto per Cloudflare Workers:

- **D1** conserva archivi e metadati;
- **R2** conserva immagini e PDF;
- **Workers** esegue il sito e le API.

## Sviluppo locale

Richiede Node.js 22.13 o successivo.

```bash
npm install
npm run dev
```

Il database e i file locali vengono conservati nella cartella `.wrangler/state`.

## Prima pubblicazione su Cloudflare

Accedere a Cloudflare:

```bash
npm run cloudflare:login
```

Creare il database D1 e il bucket R2. I comandi aggiornano automaticamente `wrangler.jsonc` con l'identificativo reale del database:

```bash
npm run cloudflare:create-db
npm run cloudflare:create-bucket
```

Applicare lo schema al database remoto:

```bash
npm run cloudflare:migrate
```

Infine pubblicare il sito:

```bash
npm run deploy
```

Wrangler restituisce l'indirizzo pubblico `workers.dev` al termine della pubblicazione.

## Pubblicazioni successive

Se lo schema non è cambiato, è sufficiente:

```bash
npm run deploy
```

Quando vengono aggiunte nuove migrazioni SQL, eseguire prima `npm run cloudflare:migrate`.
