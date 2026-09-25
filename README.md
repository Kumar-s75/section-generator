# AI Section Generator & Editor

Generate hero and pricing sections from prompts, edit text and formatting inline, and save your changes. Uses mock AI with predefined JSON layouts—no API keys required.

**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, and Zod.

## Setup

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Enter a prompt, click **Generate**, edit the preview, then **Save Changes**. The bottom-right menu contains the JSON inspector and mobile preview.

## Example prompts

- `Build a pricing section with 3 tiers`
- `Create a modern hero section`
- `Pricing for "Orbit" with 4 tiers, annual billing in EUR, dark theme`

## Commands

```sh
npm test                # Unit and API tests
npm run lint            # Lint
npm run typecheck       # TypeScript checks
npm run build           # Production build
npm start               # Production server
npx playwright install chromium
npm run test:e2e         # Build and browser tests
```

## API

| Endpoint | Purpose |
| --- | --- |
| `POST /api/generate` | Accepts `{ "prompt": "..." }`; returns `{ "layout": ... }` |
| `POST /api/save` | Accepts `{ "layout": ... }`; saves and returns a timestamp |
| `GET /api/save` | Returns the last saved layout |

## How it works

Layouts are nested nodes with `id`, `type`, `props`, and `children`. A recursive renderer maps nodes to React elements. Edits update the matching node immutably by ID; Zod validates API data.

Saves restore automatically from `.data/layout.json`. Set `LAYOUT_STORAGE_PATH` to change the location. Deployment requires a persistent writable disk.

This demo stores one shared document. Production improvements include authentication, database storage, undo/redo, schema migrations, richer sanitization, and validated real-AI output.
