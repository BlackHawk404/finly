# Finly — Personal Finance PWA

A free, private, offline-first expense tracker. Add expenses by typing — or by speaking. Your browser transcribes, a local parser extracts the details, and you confirm before saving.

All data stays on your device (IndexedDB). No accounts, no servers, no API keys.

## Features

- **Manual entry** — fast form with category chips, payment method, date.
- **Voice entry** — tap mic, say *"Spent 250 rupees on groceries yesterday with card"*, review the auto-filled form, save.
- **Insights** — monthly total, daily average, 14-day trend, category pie, per-category budgets.
- **History** — searchable, filterable list grouped by date.
- **CSV export** — download a backup any time from Settings.
- **PWA** — install to iPhone / Android / desktop home screen.
- **11 currencies** including USD, EUR, GBP, INR, PKR, AED, SAR, JPY.
- **9 voice languages** including English (US/UK/India), Hindi, Urdu, Spanish, French, German, Arabic.
- **Auto dark mode** based on system preference.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Dexie (IndexedDB)
- Zustand
- Recharts
- Web Speech API (browser-native, free, no API key)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For production:

```bash
npm run build
npm run start
```

## Browser support for voice

The Web Speech API is supported in:

- Chrome / Edge (desktop + Android) — full support
- Safari on iOS 14.5+ and macOS — full support
- Firefox — not supported (typing still works)

Voice recognition runs in the browser and requires an internet connection.

## Privacy

- All expenses live in your browser's IndexedDB. Nothing leaves your device.
- Voice transcription happens via your browser's speech engine (Apple/Google) — handled by the browser, not by this app.
- Clearing your browser data will erase your expenses. Use **Settings → Export to CSV** for backups.

## Deployment

Designed for Vercel out of the box:

```bash
npx vercel
```

Or any static host that supports Next.js (Netlify, Cloudflare Pages, etc.).

## Voice parsing examples

The parser understands plenty of natural phrasings:

| You say | What it extracts |
|---|---|
| *"Spent 250 rupees on groceries yesterday with card"* | ₹250, Groceries, yesterday, Card |
| *"Lunch 15 dollars cash"* | $15, Food & Dining, today, Cash |
| *"Uber 12.50 last monday"* | $12.50, Transport, last Monday, default |
| *"Paid 50 for coffee this morning"* | $50, Food & Dining, today, default |
| *"300 on amazon last friday upi"* | $300, Shopping, last Friday, UPI |

Anything ambiguous is left blank for you to fill in on the confirmation screen.

## File structure

```
src/
├── app/                  # Routes: Home, Add, History, Insights, Settings
├── components/
│   ├── ui/               # Button, Input, Card, Label
│   ├── charts/           # Recharts wrappers
│   └── ...               # AppShell, BottomNav, CategoryIcon,
│                         # ExpenseForm, ExpenseListItem,
│                         # VoiceRecorder, BudgetEditor
├── lib/
│   ├── db.ts             # Dexie schema
│   ├── categories.ts     # 12 categories + voice keywords
│   ├── parser.ts         # Speech → structured expense
│   ├── speech.ts         # Web Speech API wrapper
│   ├── expenses.ts       # CRUD helpers
│   ├── budgets.ts
│   ├── export.ts         # CSV export
│   ├── format.ts         # Currency / date helpers
│   └── settings.ts
└── store/
    └── useSettingsStore.ts
```
