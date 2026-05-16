# MoneyManagerAutoImport

A client-side web app that extracts transactions from a bank statement PDF, auto-categorizes them using your Money Manager history, and produces a ready-to-import `.xlsx` or `.tsv` file — all in the browser, no server required.

## Features

- **PDF parsing** — extract transactions from text-based bank statement PDFs (HDFC and generic formats)
- **Pattern learning** — upload past Money Manager exports to build a keyword → category library
- **Rule-based categorization** — 50+ built-in heuristics for common Indian merchants + your own learned patterns
- **Review table** — edit any field (note, category, subcategory, type) before downloading
- **Date range filter** — pick a subset of the statement's date range to export
- **Self-transfer protection** — transfer transactions excluded from export by default to prevent double-counting
- **One-click export** — `.xlsx` and `.tsv` in exact Money Manager import format
- **Fully offline** — no data leaves your browser (except optional AI categorization via your own API key)
- **Persistent pattern library** — stored in `localStorage`, survives page refresh

## How to use

1. Open the app (see [live site](#) or run locally)
2. Upload your bank statement PDF
3. Optionally upload a past Money Manager export to teach the app your categories
4. Click **Extract & Categorize**
5. Review and edit transactions in the table
6. Adjust the date range filter if needed
7. Click **Download .xlsx** or **Download .tsv**
8. Import the file into Money Manager

### Importing into Money Manager

- Open Money Manager → More → Import
- Select the downloaded file
- Rows flagged as `REVIEW_NEEDED` (no category assigned) will appear highlighted in MM — fix them there or re-export from this app after editing

## Running locally

```bash
git clone https://github.com/aakrandan/MoneyManagerAutoImport.git
cd MoneyManagerAutoImport
npm install
npm run dev
```

Open `http://localhost:5173/MoneyManagerAutoImport/` in your browser.

## Deploying to GitHub Pages

1. Push to `main` — the GitHub Action builds and deploys automatically
2. Go to **Settings → Pages → Source** and set it to the `gh-pages` branch
3. Your app will be live at `https://aakrandan.github.io/MoneyManagerAutoImport/`

> The `base` path in `vite.config.js` must match your GitHub repo name. It is currently set to `/MoneyManagerAutoImport/`.

## Pattern Library

The app learns from your Money Manager exports:

- Upload an export on the home screen — it extracts keyword → category mappings automatically
- Patterns persist in `localStorage` across sessions
- Open **Settings** (gear icon) to view, delete, export, or import patterns as `patterns.json`
- To sync patterns across devices: export on one device, import on another

## Self-transfer handling

When you transfer money between your own accounts (e.g. HDFC → SBI):
- The sending bank shows it as a debit
- The receiving bank shows it as a credit
- If you process both statements, the same transfer would appear twice in MM

The app automatically excludes transactions categorized as **Transfer** from the export. Use the checkbox in the review table to include any that should be exported.

## AI-assisted categorization (Phase 2)

Transactions that can't be matched by rules or your pattern library can be sent to Claude (Anthropic's AI) for categorization. You'll need your own Anthropic API key — it is never sent anywhere except directly to Anthropic's API.

To get an API key: sign up at [console.anthropic.com](https://console.anthropic.com), create a key, and paste it in **Settings → API Key**.

## Contributing

Pull requests welcome. Key areas:

- Bank-specific PDF adapters (currently HDFC + generic fallback)
- Additional heuristic rules for merchants
- UI improvements
- Tests for the PDF parser and categorizer

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| PDF parsing | pdfjs-dist v5 |
| Excel read/write | SheetJS (xlsx) |
| Hosting | GitHub Pages |

## License

MIT
