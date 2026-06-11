# Google Sheet → Inventory sync

Pulls vehicles from a Google Sheet into the site.

## 1. Make the sheet readable (required)
In the sheet: **Share → General access → "Anyone with the link" → Viewer**.
(Or **File → Share → Publish to web → CSV**.) Without this, pulls return 403.

## 2. Recommended columns (header row)
The importer matches headers flexibly (case/spacing-insensitive) and accepts synonyms:

| Field | Accepted headers |
|---|---|
| ID/Stock | `id`, `stock`, `stock #`, `vin` |
| Year | `year`, `yr` |
| Make | `make`, `brand` |
| Model | `model` |
| Price | `price`, `asking`, `sale price` |
| Mileage | `mileage`, `miles`, `odometer`, `km` |
| Body | `body`, `body style`, `type` (mapped to Sedan/Coupe/SUV/Truck/Wagon) |
| Fuel | `fuel`, `engine` (mapped to Gas/Hybrid/Electric) |
| Drive | `drive`, `drivetrain` (mapped to FWD/RWD/AWD) |
| Exterior | `exterior`, `color` |
| Interior | `interior` |
| Summary | `description`, `notes`, `summary` |
| Images | `images`, `photos` (space/comma-separated URLs) |
| Status | `status` (`sold`/`hidden` recognized, else available) |

Only **Make + Model** are strictly required per row.

## 3. Manual pull
**Admin → Inventory → "Sync from Google Sheet"** — reads the sheet and upserts.
Shows how many were synced plus any column warnings.

## 4. Automatic (daily) sync — optional
A Netlify scheduled function runs daily (`netlify/functions/scheduled-sync.mjs`, 06:00 UTC).
Set these env vars in **Netlify → Environment variables**:

- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Project Settings → API (keep secret!)
- `SYNC_SECRET` — any random string you choose

To use a different sheet, set `INVENTORY_SHEET_URL` (full edit URL or published CSV URL).
You can also trigger it manually: `POST /api/sync-inventory?secret=YOUR_SYNC_SECRET`.
