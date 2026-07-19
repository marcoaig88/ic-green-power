# Setup Supabase — IC Green Power Note spese

## 1. Crea il progetto

1. Vai su [https://supabase.com](https://supabase.com) e crea un progetto
2. Annota la **password del database** (la vedi solo alla creazione)

## 2. Variabili ambiente

In **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

In **Settings → Database → Connection string**:
- **URI** (direct, porta `5432`) → `DATABASE_URL`  
  Usa questa per `prisma migrate` / `db push`.

Copia `.env.example` in `.env` e compila i valori.

## 3. Bucket Storage

In **Storage → New bucket**:
- Name: `receipts`
- Public: **OFF** (privato)
- File size limit: 10 MB
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

Oppure esegui in **SQL Editor**:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
```

Con la `service_role` l’app carica/legge i file senza policy RLS aggiuntive.

## 4. Schema e seed

```bash
npx prisma db push
npm run db:seed
```

## 5. Deploy su Vercel

1. Push del repo su GitHub
2. Import su [vercel.com](https://vercel.com)
3. Aggiungi le stesse env vars del `.env`
4. Deploy

Dopo il deploy: `npx prisma db push` (o `migrate deploy`) punta già al DB Supabase, quindi le tabelle sono già lì.
