# AEM RSVP App: Design (v7, ready for approval)

Status: **draft for your review**. Nothing has been built yet.
Each item is tagged **[you]** (you said it), **[my call]** (I decided it, so check it) or **[open]** (needs your answer, listed at the end).

Changes from v1, based on your answers:
- Everything lives in **one Next.js app**: pages, API routes and admin login. Moving to the `zmq` pattern happens later. **[you]**
- Admin login is **its own login inside this app**, not `aem-auth`. **[you]**
- For each RSVP, the admin uploads **who can see it** (file no + ITS), through an Excel upload or a `zmq`-style grid. This works like the per-event lists in `distribution`. **[you]**

Changes in v7:
- **`aem-dev` for development and testing, `aem-prod` for live**, picked by environment variables, with guard rails so dev never touches prod. See section 2b. **[you]**

Changes in v5:
- **Reuse the existing AEM models** (`member`, `file`, `sector`, `subsector`, `user`) and add **only one new model**, `rsvp_entry`. See section 6. **[you]**
- Admin login checks the existing `user` collection. There's no pause switch, so no separate RSVP table is needed.

Changes in v4:
- **Current Next.js stack** (App Router, React 19, TypeScript) instead of the Next 13 template. **[you]**
- **No caching anywhere**: see section 2a. **[you]**

Changes in v3:
- Each uploaded row is **one member**. The household form shows **every invited member of that file**, and nobody else. **[you]**
- **How households sign in is set in each form file** (HOF ITS only, any member's ITS, or either, and whether that ITS must itself be invited). **[you]**
- **Admin only.** There are no Masool/Musaid logins and no sector-limited views. **[you]**

---

## 1. What it is

An RSVP app for the jamaat. Each RSVP (an event, a registration, a survey) is a **form**. A developer adds a form by adding **one file to a `forms/` folder** in the repo and deploying. There is no form-builder screen. **[you]**

Three parts:

1. **Admin sets up who's invited.** The admin logs in, opens an RSVP and adds the invited members as rows of **file number + ITS**, by uploading an Excel/CSV or by typing or pasting into a grid. **[you]**
2. **Household signs in.** The household enters the **file number** plus an **ITS**. The form file sets which ITS is accepted. Only files on that RSVP's invited list get in. **[you]**
3. **Household fills the member form.** It shows **every invited member of that file**, one section each. **[you]** Answers from an earlier visit are filled in so they can be reviewed and changed. **[you]**

Afterwards the admin sees every response with the member's details. **[you]**

---

## 2. Stack

It is still one app, like `aem-distribution-v2` and `ashara-rsvp`, but on the **current Next.js stack** rather than their Next 13 setup. **[you]** The specific picks below are **[my call]**. Versions are the latest stable releases when we start building.

| Part | Choice |
|---|---|
| App | Latest Next.js with the **App Router**, React 19, **TypeScript** (matching `zmq` and `aem-shared`, which makes the later move easier) |
| UI | Ant Design 5 (`@ant-design/nextjs-registry` for SSR styles), Tailwind 4, TanStack Query 5 |
| Grids | AG Grid, the same as `zmq-fe` and `distribution` |
| Excel/CSV | SheetJS (`xlsx`), installed from SheetJS's own package source, because the npm copy is stuck on an old version |
| API | App Router **route handlers** (`app/api/v1/**/route.ts`), with small wrapper helpers for DB connect, admin auth and household auth. `next-connect` isn't needed |
| Data | MongoDB via Mongoose 8, reading the shared `member` and `file` collections. The model shapes are copied from `aem-shared` so the later switch to the package is a straight swap |
| Validation | Zod: one schema per form, used by both the UI and the API |
| Auth | `jose` for the JWTs (it works in both Node and Edge), and `bcryptjs` for admin passwords |
| Lint/format | Biome, matching `zmq` and `aem-auth` |

Folder layout **[my call]**:

```
aem-rsvp-forms/
  forms/                       <- one file per RSVP
    _fields.ts                 <- field helpers + Zod schema builder
    index.ts                   <- exports every form (one line per form)
    ashara-1448.ts
  src/
    app/
      page.tsx                         <- list of open RSVPs (or redirect)
      r/[slug]/page.tsx                <- household sign-in
      r/[slug]/form/page.tsx           <- member form
      admin/login/page.tsx
      admin/page.tsx                   <- RSVP list
      admin/r/[slug]/invitees/page.tsx
      admin/r/[slug]/responses/page.tsx
      api/v1/**/route.ts
    server/   (db, models, services, auth)
    components/  hooks/  lib/
  middleware.ts                <- no-cache headers + admin route guard
```

The `forms/` folder is shared by the pages and the API routes. The page draws the form from a form file, and the API validates every save against the same file.

---

## 2a. No caching anywhere  **[you]**

Every page and every API response is always fresh. Nothing is stored in the server, the CDN, the browser or the client-side query cache. Modern Next.js caches in several places by default, so each one is switched off explicitly **[how: my call]**:

| Where | What we do |
|---|---|
| **HTTP / CDN / browser** | `middleware.ts` sets `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`, `Pragma: no-cache` and `Expires: 0` on **every** response: pages, API and RSC payloads. Vercel's CDN honours `no-store`. |
| **Route handlers** | Every `route.ts` exports `dynamic = "force-dynamic"` and `revalidate = 0`. Handlers also set `no-store` on their responses, in case middleware is skipped. |
| **Pages / layouts** | Root `app/layout.tsx` exports `dynamic = "force-dynamic"`, `revalidate = 0` and `fetchCache = "force-no-store"`, so no page is pre-rendered or kept as static/ISR output. |
| **`fetch` / data cache** | No `unstable_cache` and no `"use cache"` directive, and the `cacheComponents` / `useCache` flags stay off. Any server `fetch` passes `cache: "no-store"`. Mongo reads go straight to the DB. |
| **Client router cache** | `next.config.ts` → `experimental.staleTimes: { dynamic: 0, static: 0 }`, so going back or forward refetches. After saves we call `router.refresh()`. |
| **Link prefetch** | `<Link prefetch={false}>` everywhere, so nothing is fetched early and served stale. |
| **TanStack Query** | The default `QueryClient` uses `staleTime: 0`, `gcTime: 0`, `refetchOnMount: "always"` and `refetchOnWindowFocus: true`. Every screen refetches on load. |
| **Client API calls** | The shared `api()` helper always sends `cache: "no-store"` plus `Cache-Control: no-cache`. |
| **Browser storage** | No service worker or PWA, and no answers or lists kept in `localStorage`/`sessionStorage`. Only the auth token is kept, in an **httpOnly cookie**. |
| **Static assets** | Logo, fonts and JS bundles are the only exception. Their file names change with every build, so they can't go stale. **[my call]** If you want those uncached too, tell me, but it slows every page load. |

Not caching: Mongoose keeps **one open database connection** between requests. That reuses the connection, not data; every query still reads live from MongoDB.

A **check** in the build plan: a test hits each page and API route and fails if any response lacks `no-store`.

---

## 2b. Dev and live databases  **[you]**

Two MongoDB databases on the same cluster as `aem-map`:

| Database | Used for |
|---|---|
| **`aem-dev`** | local development, testing, Vercel preview deploys |
| **`aem-prod`** | the live site only (Vercel production) |

(You wrote "am-prod"; `aem-map`'s `.env.local` uses **`aem-prod`**, so I've assumed that's the name.)

The database is picked by **environment variables only**. The code never contains a database name. **[my call for the how]**

| Where it runs | `MONGODB_DBNAME` | Set in |
|---|---|---|
| Your machine (`npm run dev`, tests) | `aem-dev` | `.env.local` (git-ignored); `.env.example` is committed with placeholders |
| Vercel **Preview** (every branch/PR deploy) | `aem-dev` | Vercel → Project → Environment Variables → Preview |
| Vercel **Production** (main branch) | `aem-prod` | Vercel → Project → Environment Variables → Production |

`MONGODB_URI` (cluster connection string) and `JWT_SECRET` are set the same way. **Prod gets a different `JWT_SECRET`**, so a dev login token can't be used on the live site.

**Guard rails**, so dev can never touch live data by mistake **[my call]**:
- On startup the app checks `MONGODB_DBNAME`. It **refuses to start** unless the name is `aem-dev` or `aem-prod`.
- It **refuses `aem-prod` unless it's running as Vercel Production** (`VERCEL_ENV === "production"`). So a local run or a preview deploy pointed at prod by mistake fails loudly instead of writing live data.
- Test and seed scripts (sample invitees, a test form) **only run against `aem-dev`** and exit with an error otherwise.
- When connected to `aem-dev`, admin and household pages show a small **"DEV DATA"** banner, so nobody mistakes a test site for the live one.
- The `rsvp_entry` indexes are created by a one-off script (`npm run db:indexes`). It runs against `aem-dev` first, then once against `aem-prod` with an explicit `--prod` flag. Mongoose's auto-create is off in production.

Each database has its own copy of `member` / `file` / `sector` / `subsector` / `user`. Admin logins and test households are therefore whatever exists in `aem-dev`. **Assumption:** `aem-dev` has realistic member and file data and at least one `Admin` user. If it doesn't, the build plan adds a step to copy or seed some.

---

## 3. A form file  **[my call]**

```ts
// forms/ashara-1448.ts
import { defineForm, field } from "./_fields";

export default defineForm({
  slug: "ashara-1448",              // URL: /r/ashara-1448
  title: "Ashara Mubaraka 1448 RSVP",
  description: "Please fill for every member listed.",
  opensAt: "2026-11-10T00:00:00+05:30",
  closesAt: "2026-11-25T23:59:59+05:30",

  // how a household signs in: always file no + one ITS
  signIn: {
    its: "either",          // "hof" = HOF ITS only | "member" = any member's ITS | "either"
    mustBeInvited: false,   // true = the ITS entered must itself be on the invited list
  },

  // questions asked once per household (optional)
  householdFields: [
    { name: "mehmaan_count", label: "Number of guests", type: "number", min: 0, max: 20 },
  ],

  // questions repeated for each invited member
  memberFields: [
    { name: "attending", label: "Will attend?", type: "radio", options: ["Yes", "No"], required: true },
    { name: "days", label: "Which days?", type: "select", options: ["1-3", "4-6", "7-9", "All"],
      required: true, visibleIf: (v) => v.attending === "Yes" },
    { name: "needs_wheelchair", label: "Needs wheelchair access", type: "checkbox" },
    { name: "notes", label: "Notes", type: "text", maxLength: 200 },
  ],

  // member details shown read-only at the top of each section
  showMemberInfo: ["full_name", "age", "gender"],
});
```

- **The form file defines every question, and each field's `name` is its key** in the stored answers. **[you]** The answers above are saved as `{ attending: "Yes", days: "All", needs_wheelchair: false, notes: "" }`, and the admin grid uses `name` as the column id and `label` as the header.
  - `name` must be unique within a form, and `defineForm` fails the build if it isn't. **[my call]**
  - Renaming a `name` after people have answered orphans their old answers, so the rule is: don't rename once a form is live. **[my call]**
- **`householdFields`** are optional questions asked once per file. **`memberFields`** are asked once per invited member. Both use the same field format and the same "name is the key" rule. **[you: the form defines the questions; the split into household and member fields is my call]**
- **`signIn`** is set per form **[you]**. The option names and defaults (`its: "either"`, `mustBeInvited: false`) are **[my call]**. The sign-in page label follows the setting: "HOF ITS", "Your ITS" or "HOF or member ITS".
- **Field types** to start with: text, textarea, number, radio, select, multi-select, checkbox, date.
- `defineForm` builds a Zod schema from the fields. The UI uses it for inline errors and the API re-checks every save. Unknown keys are dropped, so only fields the form defines are ever stored.
- Adding a form means adding the file and one line in `forms/index.ts`.

---

## 4. Admin

### 4.1 Login  **[you: separate, in-app]**
- The login lives in this app, but it uses the **existing AEM `user` collection** (the `aem-shared` `User` model). There's no new user store. **[you]**
- `/admin/login` takes ITS or email plus a password and checks them the same way `aem-auth` does. The app then signs its own JWT and sets it in an httpOnly cookie (not `localStorage`). **[my call]**
- **Who gets in:** any user whose `userRole` includes `Admin`. No `assignedApps` check. **[you]**
- Admin users are added or edited wherever AEM users are managed today. This app has no user-management screen.
- **One role: `Admin`**, who sees and does everything. No other roles and no sector limits. **[you]**
- ⚠️ **Note:** `aem-auth` compares passwords as **plain text** (`userData.password !== password`), so passwords in `user` aren't hashed. Reusing the collection means this app must do the same, unless hashing is fixed across AEM. That's outside this project, but you should know about it.

### 4.2 RSVP list  (`/admin`)
- Every form in `forms/`, with status (upcoming / open / closed, taken from the form file's dates), invited files and members, and responded files and members.
- There's no pause switch. Open and close come only from `opensAt` / `closesAt` in the form file, so this app doesn't need a separate RSVP table. **[my call]** Closing early means changing `closesAt` and redeploying.

### 4.3 Invited list  (`/admin/r/[slug]/invitees`)  **[you]**
This is where the admin says who can see the RSVP. It works like the `zmq` "Add Mumin" modal:

- An **AG Grid with 100 blank rows**, "Add 100 rows", and paste from Excel. The editable columns are **File No** and **ITS**.
- **Upload Excel/CSV** as well. Columns `file_no` and `its` are read with `xlsx` and dropped into the same grid, so the admin can check them before saving.
- **Each row is checked** against the `member` / `file` collections:
  - the ITS exists;
  - the ITS belongs to that file;
  - no duplicates.

  Bad rows turn red with the reason. Good rows show name, age, gender, HOF name and sector, read-only.
- **Save** adds the rows to the RSVP's invited list.
  - **Adding is a merge**: existing invitees and their answers stay. This differs from `distribution`, which deletes and re-inserts. **[my call]**
  - **Removing** is a separate action: select rows, then Remove. If a removed member already answered, a warning says so; their answer is kept but hidden. **[my call]**
- **One row = one member.** To invite a whole family, the admin adds a row for each member. **[you]** (An "add whole family from the HOF row" shortcut could come later; it's not in v1.) **[my call]**
- Below the grid is the **current invited list** with search, counts and Excel download.

### 4.4 Responses  (`/admin/r/[slug]/responses`)
- AG Grid, **one row per invited member**:
  - columns: file no, HOF name, sector, sub-sector, ITS, name, age, gender, *each form field*, submitted at, updated at, submitted-by ITS;
  - members who haven't answered show as blank, with status "Pending".
- Filters: sector, sub-sector, answered / pending, any field value.
- Summary counts at the top, such as Attending Yes/No by gender.
- **Excel download** of the current view. Household answers repeat on each member row of that file, and there's also a "per file" toggle.
- **Admins can fill in or change answers** for any invited household. **[you]**
  - Each row has an **"Open form"** button. It opens the same household form the family sees, for the whole file (household questions plus every invited member), in admin mode. **[my call]**
  - It uses the same single Submit and the same validation as the household.
  - Admins can save even after the RSVP has closed. **[my call]**
  - Each save records `submitted_by_its` as the admin's ITS and sets `submitted_via: "admin"`, so admin entries can be told apart in the grid. **[my call]**

---

## 5. Household flow

### Step 1: Sign in  (`/r/[slug]`)
- Shows the form title, description and dates. If the form isn't open: "Not open yet" or "Closed".
- Inputs: **File No** and **ITS**, labelled according to the form's `signIn.its`.
- The server checks that:
  - the RSVP is open;
  - the file has at least one invited member for this RSVP;
  - the ITS fits `signIn.its`:
    - `hof`: it equals the HOF (`file._id`);
    - `member`: it is in `file.member_ids`;
    - `either`: one of the two;
  - if `signIn.mustBeInvited`, that ITS is also on the invited list.
- On success it issues a **household token**: a JWT for this file and this RSVP only, valid about 30 min. It is separate from admin login. **[my call]**
- A wrong match gets one generic error ("File number and ITS don't match"), with a simple per-IP attempt limit. **[my call]**

### Step 2: Member form  (`/r/[slug]/form`)
- Header: file no, HOF name, sector.
- If the form has `householdFields`, a **household card** comes first.
- **One card per invited member of this file**, whoever signed in. Members of the file who aren't invited don't appear. **[you]**
- Each card shows that member's details, then the form fields.
- Earlier answers are filled in, with a "Last saved …" note.
- **One Submit for the whole household**: the household card and every member card are checked and saved together, all or nothing. **[you]** If any card has an error, nothing is saved and the page scrolls to the first error.
- Afterwards, a thank-you screen with a summary and an "Edit" link while the RSVP is open.
- Mobile-first, since people will mostly open it from a WhatsApp link.

---

## 6. Data model  **[my call]**

**Reuse the existing AEM models, and add just one new one.** **[you]**

| Model | Collection | Use here |
|---|---|---|
**Database:** the same MongoDB cluster and databases `aem-map` uses (`aem-dev` for dev and testing, `aem-prod` for live; see 2b). It has the full `member` / `file` / `sector` / `subsector` / `user` data. **[you]** The new `rsvp_entry` collection is created there as well. **[my call]**
- Connection settings are **server-only** env vars (`MONGODB_URI`, `MONGODB_DBNAME`, `JWT_SECRET`), with no `NEXT_PUBLIC_` prefix. `aem-map` currently uses `NEXT_PUBLIC_MONGODB_*`, which Next.js builds into the browser JavaScript; this app must not repeat that. **[my call]**
- An uploaded ITS that isn't in `member`, or doesn't belong to that file, is **blocked** (red row) and can't be saved. **[my call, since aem-map holds the full data]**

| Model | Collection | Use here |
|---|---|---|
| `File` | `file` | read only: `tanzeem_file_no`, `member_ids`, HOF, sector / sub-sector |
| `Sector`, `Subsector` | `sector`, `subsector` | read only, for filters |
| `User` | `user` | read only: admin login |
| **`RsvpEntry`** (new) | **`rsvp_entry`** | invites and answers |

The existing models are **copied** from `@aemmarol/aem-shared` (same schemas, same collection names) into `src/server/models/`. Later they get replaced by importing the package. **[you]**

The new model has **two kinds of document**, both in `rsvp_entry`. **[my call]**
- **Member entries:** one per (RSVP, invited member). Created when the admin invites the member; holds that member's answers.
- **Household entry:** one per (RSVP, file), only if the form has `householdFields`. Created on the first submit; holds the household answers.

```ts
// rsvp_entry
{
  rsvp: String,              // form slug, e.g. "ashara-1448"
  kind: "member" | "household",
  file_id: String,           // File._id (HOF ITS) → File
  tanzeem_file_no: Number,   // copied so sign-in can look up by file no fast
  member_id: String | null,  // ITS → Member  (null for household entries)

  // invite (member entries only, set by admin)
  invited_by: String,        // admin user ITS
  is_removed: Boolean,       // soft remove: hidden, but any answer is kept

  // answer: keys are the form field `name`s
  data: Object | null,       // e.g. { attending: "Yes", days: "All" }; null until submitted
  submitted_by_its: String | null,
  submitted_via: "household" | "admin" | null,
  submitted_at: Date | null,

  createdAt, updatedAt
}
// unique: { rsvp, kind, file_id, member_id }
// index:  { rsvp, tanzeem_file_no }
```

- One household Submit writes the household entry and every member entry for that file in a **single MongoDB transaction**, so a save is never half done. **[my call]**
- "Pending" means `data` is null; "answered" means it's set. This one collection gives both the invited list and the responses grid.
- Names, age and sector are **looked up from `member`/`file` when shown**, not copied, so lists stay current.
- Each save **overwrites** `data`. No history in v1.
- No other collections are written to. The form's settings live in the form file, not the database.

---

## 7. API routes  **[my call]**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/admin/login` | none | admin login → JWT |
| GET | `/api/v1/admin/verify` | admin | current admin |
| GET | `/api/v1/admin/rsvp` | admin | list forms + counts |
| POST | `/api/v1/admin/rsvp/[slug]/invitees/validate` | admin | check grid rows, return member details + errors |
| POST | `/api/v1/admin/rsvp/[slug]/invitees` | admin | add (merge) invitees |
| DELETE | `/api/v1/admin/rsvp/[slug]/invitees` | admin | remove selected invitees |
| GET | `/api/v1/admin/rsvp/[slug]/invitees` | admin | current invited list |
| GET | `/api/v1/admin/rsvp/[slug]/responses` | admin | rows for the responses grid |
| GET | `/api/v1/admin/rsvp/[slug]/household/[fileNo]` | admin | a file's invited members + answers, for admin edit |
| PUT | `/api/v1/admin/rsvp/[slug]/household/[fileNo]` | admin | save a file's answers as admin (works after close) |
| GET | `/api/v1/rsvp/[slug]` | none | public form info + open state |
| POST | `/api/v1/rsvp/[slug]/sign-in` | none (limited) | file no + ITS → household token |
| GET | `/api/v1/rsvp/[slug]/household` | household | invited members + earlier answers |
| PUT | `/api/v1/rsvp/[slug]/household` | household | save household + all invited members' answers in one go |

---

## 8. Goals, non-goals, failure

**Goals**
- A developer adds a new RSVP form with one file and a deploy.
- The admin sets up who's invited by pasting or uploading in a few minutes.
- A household finishes on a phone in under 2 minutes.
- The admin can answer "who's coming, and who hasn't replied?" without a spreadsheet.

**Non-goals (v1)**
- A form-builder screen, or admin-user management.
- OTP/SMS, payments, notifications.
- Answer history.
- The `zmq` split (Vite + Lambda + `aem-shared` + `aem-auth`). That's a later migration, but the folder names and API shapes above are chosen to make it easy.

**It would be a failure if**
- a household could see or change another household's answers, or members who aren't invited;
- adding a form needed changes outside `forms/`;
- re-uploading the invited list wiped answers people had already given.

---

## 9. Decisions log

All open questions are answered. **[you]**

| # | Question | Answer |
|---|---|---|
| 1 | Name / location | New repo and project: **`aem-rsvp-forms`** (`/Users/adnan/Documents/GitHub/aem/aem-rsvp-forms`) |
| 2 | Saving | **One Submit per household** |
| 3 | Questions | **The form file defines them; a field's `name` is its key** in the stored answers |
| 4 | Admin edits | **Yes**: admins can fill and change any household's answers |
| 5 | Data source | **`aem-map`'s database** has the full member/file data |
| 6 | Hosting | **Vercel** (Preview → `aem-dev`, Production → `aem-prod`) |
| 7 | Admin access | **`userRole` includes `Admin`** is enough |
| 8 | Models | **Copy** the `aem-shared` schemas for now |
| – | Invite level | One uploaded row = one member; the form shows every invited member of the file |
| – | Sign-in rule | Set per form (`signIn` block) |
| – | Roles | Admin only |
| – | Stack | Current Next.js (App Router, React 19, TypeScript); one app |
| – | Caching | None anywhere (section 2a) |
| – | Models | Reuse existing AEM collections; one new (`rsvp_entry`) |

## 10. Left to the builder

These don't change what gets built, so they're settled during the build:
- exact package versions (latest stable at start);
- page styling details, within Ant Design + Tailwind and the AEM logo and colours;
- the sign-in attempt limit (around 10 tries per IP per 15 minutes, kept in MongoDB rather than in memory, since Vercel runs several instances);
- Excel column header matching (case-insensitive `file_no` / `file no` / `ITS` / `its_id`).
