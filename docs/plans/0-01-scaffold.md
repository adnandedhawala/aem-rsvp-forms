# 0-01 Scaffold

Status: Built · 6 Nov 2026
Kind: new · Spec: 2 (stack) · Depends on: none

## Decide
- Creates the Next.js 16 app (App Router, TypeScript, Tailwind 4, `src/`, alias `@/*`) in the existing repo, keeping `docs/`, `CLAUDE.md` and `RSVP-DEV-PLAN.md`.
- Installs every runtime and dev dependency the later plans need, so no later plan touches `package.json` except to add scripts.
- Biome replaces ESLint, matching `zmq` / `aem-auth`.
- SheetJS comes from `https://cdn.sheetjs.com` (the npm copy is stale).
- No blocking questions.

## Builder context
- Spec 2 table (stack). Dev plan §3 (rules).
- Existing apps for reference only: `../zmq/zmq-fe/package.json`, `../distribution/aem-distribution-v2/package.json`.

## Interfaces
- **Consumes:** none.
- **Produces:**
  - npm scripts `dev`, `build`, `start`, `test` (`vitest run`), `lint` (`biome check .`), `db:indexes` (`tsx scripts/db-indexes.ts`), `e2e` (`tsx scripts/e2e.ts`);
  - TS path aliases `@/*` → `src/*` and `@forms/*` → `forms/*`;
  - Vitest config (node env; jsdom via a per-file header).

## Files
| File | New / changed | What |
|---|---|---|
| everything `create-next-app` makes | new | the app |
| `package.json` | new | deps + scripts above |
| `tsconfig.json` | new | add `@forms/*` path; include `forms/**/*.ts` |
| `vitest.config.ts` | new | `react()`, `tsconfigPaths()`, `environment: "node"`, `include: ["src/**/*.test.{ts,tsx}", "forms/**/*.test.ts"]`, `testTimeout: 30000`, `hookTimeout: 120000` |
| `biome.json` | new | from `biome init`; ignore `.next`, `node_modules` |
| `.env.example` | new | below |
| `.gitignore` | changed | has `.env*` and `!.env.example` |
| `src/app/page.tsx` | changed | body `<main>AEM RSVP</main>` (replaced in 5-01) |
| `src/smoke.test.ts` | new | `expect(1 + 1).toBe(2)` |

`.env.example`:
```
MONGODB_URI=mongodb+srv://USER:PASS@HOST/?retryWrites=true&w=majority
MONGODB_DBNAME=aem-dev
JWT_SECRET=change-me-at-least-32-chars
# optional; without it AG Grid enterprise shows a watermark (same as zmq/distribution)
NEXT_PUBLIC_AG_GRID_LICENSE=
```

## Steps
- [ ] 1. Scaffold into a temp dir and copy in (repo root `/Users/adnan/Documents/GitHub/aem/aem-rsvp-forms`):
  ```bash
  npx create-next-app@latest /tmp/rsvp-scaffold --ts --app --src-dir --tailwind --no-eslint --import-alias "@/*" --use-npm --turbopack --yes
  rsync -a --exclude .git /tmp/rsvp-scaffold/ ./ && rm -rf /tmp/rsvp-scaffold
  ```
- [ ] 2. Install:
  ```bash
  npm i antd @ant-design/nextjs-registry @tanstack/react-query ag-grid-community ag-grid-enterprise ag-grid-react mongoose zod jose dayjs server-only https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz
  npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom mongodb-memory-server @playwright/test tsx @biomejs/biome
  npx @biomejs/biome init
  ```
- [ ] 3. Write the config files in the table, and `src/smoke.test.ts`.
- [ ] 4. Run `npx biome check --write .`, then `npm test` (1 passed), `npm run lint` (clean) and `npm run build` (succeeds).
- [ ] 5. Commit: `chore: scaffold Next.js app with tooling`.

## Manual test
1. `npm run dev`. Opening `http://localhost:3000` shows "AEM RSVP".

## Open questions
None.

## Out of scope
Any app code; that starts in 0-02.
