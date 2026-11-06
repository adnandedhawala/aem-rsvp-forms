# 7-02 Deploy: README, CI, Vercel

Status: Planned · 6 Nov 2026
Kind: new · Spec: 2b, 9 (hosting) · Depends on: 7-01

## Decide
- **README:** what the app is, how to add a form, local setup, the two databases, Vercel variables, and the first-deploy checklist.
- **CI** (GitHub Actions) runs lint, unit tests and e2e on every push and PR, with no secrets (memory DB).
- **Vercel:** Preview uses `aem-dev`; Production uses `aem-prod` with its own `JWT_SECRET`.
- The `rsvp_entry` indexes are created once on each database with `npm run db:indexes`.
- The Vercel and `aem-prod` steps are **yours** (dev plan §5). I prepare everything else.
- No blocking questions.

## Builder context
- Spec 2b (both tables, guard rails). Dev plan §5.

## Interfaces
- **Consumes:** every npm script from 0-01, 0-03 and 7-01.
- **Produces:** `README.md` and `.github/workflows/ci.yml`.

## Files
| File | New / changed | What |
|---|---|---|
| `README.md` | changed (replaces scaffold's) | sections below |
| `.github/workflows/ci.yml` | new | on `push` and `pull_request`: Node 22, `npm ci`, `npm run lint`, `npm test`, `npx playwright install --with-deps chromium`, `npm run e2e` |
| `RSVP-DEV-PLAN.md` | changed | §1 state after deploy |
| `CLAUDE.md` | changed | drop "(once 0-01 is built)" |

**README sections:**
1. **What it is:** one paragraph, with links to the spec and `RSVP-DEV-PLAN.md`.
2. **Adding a form:**
   1. copy `forms/sample-rsvp.ts` to `forms/<slug>.ts`;
   2. set the slug, title, dates, `signIn` and fields;
   3. add one line in `forms/index.ts`;
   4. `npm test` and `npm run build` (a bad form fails the build);
   5. deploy;
   6. invite people at `/admin/r/<slug>/invitees`.

   **Never rename a field `name` once people have answered.**
3. **Local setup:** `cp .env.example .env.local`, fill in the `aem-dev` values, `npm i`, `npm run dev`.
4. **Databases:** the spec 2b tables and guard rails.
5. **Vercel variables:**

   | Variable | Preview | Production |
   |---|---|---|
   | `MONGODB_URI` | cluster URI | cluster URI |
   | `MONGODB_DBNAME` | `aem-dev` | `aem-prod` |
   | `JWT_SECRET` | dev secret (32+ chars) | **different** prod secret (32+ chars) |
   | `NEXT_PUBLIC_AG_GRID_LICENSE` | optional | optional |
6. **First deploy checklist:**
   1. `npm run db:indexes`;
   2. `npm run db:indexes -- --prod` (with prod values in a temporary env);
   3. confirm an `Admin` user exists in each database;
   4. push `main`;
   5. open the production URL, check there's **no** DEV DATA strip, and log in as Admin.
7. **Scripts:** `dev`, `test`, `lint`, `build`, `e2e`, `db:indexes`.

## Steps
- [ ] 1. Write `README.md` and `ci.yml` per Files.
- [ ] 2. Run `npm run lint && npm test && npm run e2e`. Expected: all pass.
- [ ] 3. Commit: `docs: README, deploy checklist, CI`.
- [ ] 4. **You:** create a GitHub repo and push; check that CI goes green.
- [ ] 5. **You:** create the Vercel project from the repo and set the variables from the README table.
- [ ] 6. **You:** run the first-deploy checklist.
- [ ] 7. Update `RSVP-DEV-PLAN.md` §1 and commit: `docs: v1 deployed`.

## Manual test
The first-deploy checklist, plus:
1. Open a preview URL and check that the DEV DATA strip shows.
2. On production, do one full household sign-in and submit with a real file (then remove that invitee, or keep it as a live test).

## Open questions
1. Which GitHub org or account will the repo live under? Recommended: the same place as the other AEM repos.

## Out of scope
A custom domain (can be added in Vercel later).
