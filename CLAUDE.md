# aem-rsvp-forms

RSVP app for AEM. Each RSVP is a file in `forms/`. Admins invite members (file no + ITS) and see or edit responses; households sign in with file no + ITS and submit one form for every invited member. One Next.js 16 app (App Router, TypeScript), MongoDB via Mongoose, deployed on Vercel.

- **What and why:** `docs/superpowers/specs/2026-11-06-rsvp-forms-design.md`
- **Build order, status and rules:** `RSVP-DEV-PLAN.md`. Read section 3 (rules every plan follows) before changing anything.
- **Work in progress:** `docs/plans/<phase>-<NN>-<name>.md`. Build only an **Approved** plan, follow its steps, then the loop in `RSVP-DEV-PLAN.md` section 2.
- **Later changes:** start with `docs/requests/REQUEST_TEMPLATE.md`.

## Hard rules (details in RSVP-DEV-PLAN.md §3)

- No caching anywhere: every response is `no-store`.
- `MONGODB_DBNAME` is `aem-dev` (local, tests, previews) or `aem-prod` (Vercel production only). Never point local work at `aem-prod`.
- Never read, print or commit `.env.local`.
- Only one new collection: `rsvp_entry`. The AEM models are read-only copies of `aem-shared`.

## Commands

```bash
npm run dev          # local, on aem-dev
npm test             # vitest (memory MongoDB)
npm run lint         # biome
npm run build
npm run e2e          # playwright on a memory DB (after 7-01)
npm run db:indexes   # rsvp_entry indexes on aem-dev; add -- --prod for aem-prod
```
