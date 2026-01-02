# AuftragPilot MVP (Handwerk + Gastro)

Dies ist ein sofort testbares MVP als **Web-App** (läuft im Browser).

## Starten (lokal)

1) Node.js installieren (falls noch nicht vorhanden)
2) In diesem Ordner:

```bash
npm install
npm run dev
```

Dann im Browser öffnen: http://localhost:5173

## Was ist drin?
- Handwerk: Anfrage-Flow → Richtpreis → Fotos → Termin → Dashboard (Leads + Score + Status)
- Gastro: Platzhalter (bereit zum Ausbau)

## Hinweise
- Speicherung via `localStorage` (Demo)
- Später leicht erweiterbar: Supabase (DB/Auth), Stripe (Abo/Pay-per-Lead), E-Mail/SMS.
