# Tabelle ACI — import costi chilometrici

Le tabelle ACI (Gazzetta Ufficiale / Agenzia delle Entrate) indicano il **costo chilometrico di esercizio (€/km)** per marca e modello, suddivise per:

- alimentazione (benzina, gasolio, GPL, ibrido, elettrico, …)
- in produzione / fuori produzione
- tipo veicolo (autoveicolo, motoveicolo, autocaravan)

## Formato CSV

Separatore `;`, UTF-8, decimali con `,` o `.`.

| Colonna | Obbligatoria | Esempio | Note |
|---------|--------------|---------|------|
| `year` / `anno` | sì | `2026` | Un solo anno per file |
| `vehicleType` / `tipo` | no | `autoveicolo` | default `autoveicolo` |
| `fuelType` / `alimentazione` | no | `benzina` | vedi alias sotto |
| `production` / `produzione` | no | `in_produzione` | o `fuori_produzione` |
| `brand` / `marca` | sì | `FIAT` | |
| `model` / `modello` | sì | `Panda 1.0 …` | |
| `ratePerKm` / `costo_km` | sì | `0,4120` | **usato per i rimborsi** |
| `fringe25` … `fringe60` | no | | fringe benefit annui |

Template di esempio: [`../data/aci-template.csv`](../data/aci-template.csv)

## Import

```bash
# applica schema DB (una volta)
# su Supabase: esegui supabase/aci-tables.sql
# oppure: npx prisma db push

npx tsx scripts/import-aci.ts data/aci-template.csv
```

Oppure da admin autenticato:

`POST /api/admin/aci/import` (multipart `file` oppure JSON `{ "csv": "..." }`)

`GET /api/admin/aci/import` → elenco annualità importate.

Per default l’import **sostituisce** tutte le righe dell’anno presente nel CSV.

## Alias accettati

- alimentazione: `diesel`→gasolio, `phev`/`plug-in`→plug_in, `bev`→elettrico, …
- produzione: `in` / `fuori`, `in produzione`, …
- tipo: `auto`, `moto`, `camper`, …

## Uso in app (prossimo passo)

Ogni `Expense` può collegare `aciVehicleRateId` (+ `vehicleBrand` / `vehicleModel`).  
Finché non c’è il selettore veicolo, resta la tariffa aziendale fissa `0,30` €/km.
