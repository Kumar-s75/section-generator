# AI Section Generator & Editor

**Uncody** is a small website-builder playground: describe a hero or pricing section, generate a nested JSON tree, edit text directly in the preview, and save the updated tree. Generation is deterministic keyword matching; there are no external AI calls, credentials, or paid services.

## Run locally

Use Node.js 22.12+ (verified with Node 24) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Enter a prompt (or choose one from the input suggestions), click **Generate**, click any heading, paragraph, feature or button label to edit, then **Save changes**. Open the bottom-right **View options** menu for the JSON inspector and desktop/mobile preview controls. The JSON view reflects each edit immediately; narrow browser windows stack the interface. Generating again asks before replacing unsaved work. Saved sections and their prompts automatically restore on reload, including after restarting the server.

```sh
npm test           # Vitest: schema, tree utilities, rendering and API handlers
npm run lint       # ESLint, including React and Next rules
npm run typecheck  # Strict TypeScript
npm run build      # Production compilation
npm start          # Serve the production build
npm run test:e2e   # Build + Chromium flows against an isolated production server
```

For a fresh environment, install the test browser with `npx playwright install chromium`. Browser screenshots are written to `test-results/` (ignored by git).

## Technology and structure

Next.js App Router and route handlers keep frontend and backend in one project. React state holds the active document; TypeScript and Zod share a serializable contract. Tailwind CSS 4 is configured alongside a custom CSS design system; Lucide provides lightweight icons. Dependencies are locked in `package-lock.json`. Development and production builds use Turbopack. The earlier sandbox port-binding failure was not reproducible with local worker-port permissions; no Webpack fallback is needed.

| File                                                             | Purpose                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| `app/page.tsx`, `app/layout.tsx`, `app/globals.css`              | App entry, metadata and responsive presentation          |
| `components/editor.tsx`, `preview-canvas.tsx`, `inline-text.tsx` | Prompt, requests, state, feedback, preview and inspector |
| `components/recursive-renderer.tsx`                              | Central node-to-element registry and inline editing      |
| `lib/schema.ts`                                                  | Shared node types and request validation                 |
| `lib/layouts.ts`, `lib/prompt-options.ts`                        | Distinct hero/pricing trees and keyword selection        |
| `lib/tree.ts`                                                    | Immutable ID-based updates and node counting             |
| `lib/storage.ts`                                                 | Atomic file persistence                                  |
| `lib/api.ts`, `app/api/*/route.ts`                               | JSON parsing and API endpoints                           |
| `tests/`                                                         | Unit, route, renderer and browser tests                  |

## API

All POST endpoints accept JSON and return `{ "error": "A useful message" }` with HTTP 400 for invalid requests. Layouts reject unknown properties/types, duplicate IDs, more than 500 nodes, depth above 20, and non-section roots. Request text is limited to 250,000 characters after reading; a production server should enforce streaming byte limits before buffering.

### `POST /api/generate`

```json
{ "prompt": "Build a pricing section with 3 tiers" }
```

Returns `{ "layout": UINode }`. Matching is case-insensitive; `pricing` wins if both keywords appear, `hero` selects the hero, and unsupported prompts return a helpful 400. Prompts are trimmed and limited to 2,000 characters. A 500 ms delay demonstrates the loading state. Each request returns a fresh tree.

Example prompts:

- Create a modern hero section for a developer platform
- Build a pricing section with 3 tiers
- Build pricing for "Orbit" with 4 tiers, annual billing in EUR, dark theme and indigo accent
- Create a hero for "Bloom" with headline "Make room for better ideas" and button "Join us", rose accent

Supported prompt controls are 1–4 tiers (digits or one/two/three/four), annual/yearly billing, USD/EUR/GBP/INR, light/dark theme, sage/indigo/rose accents, and quoted brand/headline/button text. Annual sample prices are ten times monthly sample prices. Currency selection changes the displayed currency; it is not an exchange-rate calculation. Unknown prose does not change the output. Unsupported numeric tier counts return 400.

### `POST /api/save`

Accepts `{ "layout": UINode, "prompt"?: "original prompt" }`. Returns `{ "success": true, "savedAt": "ISO-8601 timestamp" }`. The validated tree is written to disk using a unique temporary file, flushed, and atomically renamed. Only the latest save is kept. Storage failures return HTTP 500 without exposing filesystem paths.

### `GET /api/save`

Returns `{ "schemaVersion": 1, "layout": UINode, "savedAt": "ISO-8601 timestamp", "prompt"?: "original prompt" }`, or `{ "layout": null, "savedAt": null }` before the first save. Responses disable caching. The frontend uses this endpoint to restore saved content. Corrupted or unsupported-version files return HTTP 500 without being silently overwritten.

## Durable storage

The default file is `.data/layout.json` (git-ignored). Set `LAYOUT_STORAGE_PATH` to change its location; `.env.example` documents the setting. Use a persistent writable volume for deployments. The filesystem adapter in `lib/storage.ts` is isolated and can later be replaced with database storage. Restart tests save to a temporary directory, stop a real production server, start a new process, and verify both the API and restored editor. Browser tests use `.data/e2e-layout.json` and ports 3100/3101, leaving the app’s normal saved document untouched.

## JSON, rendering and editing

```json
{
  "id": "section-1",
  "type": "section",
  "children": [
    {
      "id": "title-1",
      "type": "heading",
      "props": { "text": "Your next big idea", "level": 1 }
    }
  ]
}
```

Nodes have a unique `id`, an allowlisted `type`, optional typed `props`, and optional nested `children`. Supported types are section, container, heading, paragraph, button, pricingGrid, pricingCard, price, featureList and featureItem. Props control text, heading level, presentation variants, container arrangement, allowlisted themes/accents, and pricing metadata. Plan names are editable heading nodes; price and billing period are read-only price nodes. Legacy documents using pricing-card metadata still render.

`RecursiveRenderer` looks up each node in one registry and recursively renders its children. Layout composition lives entirely in the backend templates; the renderer knows only individual node types. Unknown types fall back gracefully. React renders text as text; no raw HTML or `dangerouslySetInnerHTML` is used.

Editable elements use `contentEditable` with an intentionally stable initial text child and `suppressContentEditableWarning`. The browser owns the editing DOM, so state updates do not reset the caret. Each input calls `updateNodeText(root, id, text)`, which recursively copies only the matching node and its ancestors, preserving untouched branches. Regeneration remounts the renderer; switching views seeds it from the latest JSON. Enter finishes an edit; Shift+Enter permits multiline text. Paste inserts plain text. Edits update state immediately, so clicking Save captures the current content without relying on blur timing.

## Tradeoffs and production work

- File storage survives reloads and process restarts on a persistent disk. It remains a single shared document with last-writer-wins behavior; it is not a multiuser database. Ephemeral serverless filesystems still require an external persistent store.
- Add authentication, authorization, request rate limits and durable revision history for production.
- Saved records include schema version 1; add explicit migrations when introducing incompatible schema changes.
- Add undo/redo and conflict handling for simultaneous edits, plus import/export controls.
- Text formatting is stored as allowlisted JSON props (bold, italic, underline, hex color, and http/https link metadata). It applies to a whole text node, not arbitrary character ranges. Links do not navigate while editing. React escaping and plain-text paste keep content free of raw HTML. Add a content security policy and explicit image/URL policies before expanding to richer content.
- Real AI integration should run on the server and generate constrained structured output, validated against the same schema, with retries, timeouts and usage controls.
- The small demo uses local component state and parameterized templates rather than arbitrary AI-generated layouts. Generated call-to-action buttons edit their labels; they do not navigate or purchase anything.
- No external fonts or image downloads are required to run or build the app.

## Reference UI

The editor follows the sample UI on page 2 of the assignment PDF: a 41 px white toolbar, centered prompt input, navy Generate button, green Save Changes button, and a centered three-card pricing group. Default plans are Starter ($10/mo), Pro ($29/mo), and Enterprise ($50/mo). The reference’s placeholder feature wording is retained for visual fidelity. Browser tabs/address bars and the surrounding PDF document are not part of the app.

Click any text to reveal the blue selection handles and floating formatting toolbar. Bold, italic, underline, color and link metadata update the same JSON tree and persist with Save Changes. Prices remain read-only. Generating pricing selects the Pro heading to reproduce the screenshot’s editing state.

The comparison screenshot is generated at a 1184 × 596 viewport in `test-results/reference-match.png`. The PDF contains a compressed raster image, so original font rasterization and exact source pixels cannot be recovered. The layout, geometry, colors and typography are matched against that available reference; mobile layouts stack the cards.
