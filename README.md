# aem-rsvp-forms

RSVP app for AEM. Each RSVP is a file in `forms/`. Admins invite members (file no + ITS) and see or edit responses; households sign in with file no + ITS and submit one form for every invited member. One Next.js 16 app (App Router, TypeScript), MongoDB via Mongoose, deployed on Vercel.

- What and why: [`docs/superpowers/specs/2026-11-06-rsvp-forms-design.md`](docs/superpowers/specs/2026-11-06-rsvp-forms-design.md)
- Build order, status and rules: [`RSVP-DEV-PLAN.md`](RSVP-DEV-PLAN.md)

## Adding a form

1. Copy `forms/sample-rsvp.ts` to `forms/<slug>.ts`.
2. Set the slug, title, dates, `signIn` and fields.
3. Add one line in `forms/index.ts`.
4. Run `npm test` and `npm run build` (a bad form fails the build).
5. Deploy.
6. Invite people at `/admin/r/<slug>/invitees`.

**Never rename a field `name` once people have answered.** The name is the key in the stored answers.

## Local setup

```bash
cp .env.example .env.local   # fill in the aem-dev values
npm i
npm run dev
```

## Databases

| Where | `MONGODB_DBNAME` |
|---|---|
| Local, tests, Vercel previews | `aem-dev` |
| Vercel production only | `aem-prod` |

`MONGODB_DBNAME` must be `aem-dev` or `aem-prod`, and `aem-prod` is refused unless `VERCEL_ENV` is `production`. Never point local work at `aem-prod`. The only new collection is `rsvp_entry`; the AEM models are read-only copies of `aem-shared`.

Every response is `no-store`. There is no caching anywhere.

## Vercel variables

| Variable | Preview | Production |
|---|---|---|
| `MONGODB_URI` | cluster URI | cluster URI |
| `MONGODB_DBNAME` | `aem-dev` | `aem-prod` |
| `JWT_SECRET` | dev secret (32+ chars) | **different** prod secret (32+ chars) |
| `NEXT_PUBLIC_AG_GRID_LICENSE` | optional | optional |

Pushing to `main` deploys to production.

## First deploy checklist

1. `npm run db:indexes` (on `aem-dev`).
2. `npm run db:indexes -- --prod` (with the prod values in a temporary env; never commit them).
3. Confirm an `Admin` user exists in each database.
4. Push `main`.
5. Open the production URL, check there is **no** DEV DATA strip, and log in as Admin.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | local server, on `aem-dev` |
| `npm test` | vitest (memory MongoDB) |
| `npm run lint` | biome |
| `npm run build` | production build |
| `npm run e2e` | playwright on a memory DB |
| `npm run db:indexes` | `rsvp_entry` indexes on `aem-dev`; add `-- --prod` for `aem-prod` |
