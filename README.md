# IC Green Power — Note spese

App web per note spese con estrazione AI (Gemini) da scontrini foto/PDF.

**Stack:** Next.js · Prisma · **Supabase** (Postgres + Storage) · Google Gemini

## Funzionalità

- Login per selezione profilo (admin / dipendenti)
- Upload scontrino → estrazione AI → conferma campi
- Stati: bozza → inviata → approvata / rifiutata
- File su Supabase Storage (privato, URL firmati)

## Setup locale con Supabase

### 1. Progetto Supabase

Segui la guida in [`supabase/README.md`](./supabase/README.md):

1. Crea progetto su [supabase.com](https://supabase.com)
2. Crea bucket `receipts` (privato) — o esegui `supabase/setup.sql`
3. Copia le chiavi API e la connection string Postgres

### 2. Variabili ambiente

```bash
cp .env.example .env
```

Compila in `.env`:

| Variabile | Dove trovarla |
|-----------|----------------|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (porta **6543**, user `postgres.[REF]`) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT-REF].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → `service_role` / secret |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GOOGLE_MAPS_API_KEY` | Google Cloud → abilita **Distance Matrix API** (calcolo km) |
| `SESSION_SECRET` | Stringa lunga casuale |

### 3. Installazione

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### Utenti demo (dopo seed)

| Nome | Email | Ruolo |
|------|-------|--------|
| Admin IC | admin@icgreenpower.it | admin |
| Marco Rossi | marco@icgreenpower.it | employee |
| Laura Bianchi | laura@icgreenpower.it | employee |
| Giulia Verdi | giulia@icgreenpower.it | employee |

Login: seleziona il profilo dalla home (senza password).

## Deploy online (Vercel + Supabase)

1. Push del codice su GitHub
2. Su [vercel.com](https://vercel.com) → Import repository
3. Aggiungi le **stesse env vars** del `.env`
4. Deploy

Il database e i file restano su Supabase; Vercel serve solo l’app Next.js.

```bash
# Prima del primo deploy (una tantum, dal tuo PC):
npx prisma db push
npm run db:seed
```

## Script utili

```bash
npm run dev          # sviluppo
npm run build        # build produzione
npm run db:push      # sincronizza schema su Supabase
npm run db:seed      # utenti demo
npm run db:studio    # esplora tabelle
```

## Note sicurezza (produzione)

- Non esporre `SUPABASE_SERVICE_ROLE_KEY` al browser (solo server)
- Cambia `SESSION_SECRET`
- Per uso aziendale reale, aggiungi password/PIN al login
- Il free tier Gemini e Supabase bastano per un team piccolo (~10 persone)
