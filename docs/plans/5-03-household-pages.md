# 5-03 Household pages: sign-in, form, thank-you

Status: Planned · 6 Nov 2026
Kind: new · Spec: 5 · Depends on: 3-01, 3-02, 5-02

## Decide
- `/r/[slug]` is the sign-in page. It shows the title, description and dates, and "Not open yet" / "Closed" / "RSVP not found" when it can't be filled. The ITS label follows the form's `signIn`.
- `/r/[slug]/form` is the household form. An expired session goes back to sign-in, and server errors show on the right card.
- `/r/[slug]/done` shows "Thank you", a read-only summary, and "Edit answers" while the RSVP is open.
- Mobile-first: one column, at least 44 px touch targets, and checked at 375 px.
- No blocking questions.

## Builder context
- Spec 5. ITS labels: `hof` → "HOF ITS", `member` → "Your ITS", `either` → "HOF or member ITS".

## Interfaces
- **Consumes:**
  - from 5-01: `api`, `ApiError`, `Logo`;
  - from 5-02: `HouseholdForm`;
  - from 1-01: `getForm`, `isFieldVisible`;
  - from 3-01: `GET /api/v1/rsvp/[slug]` and `POST /api/v1/rsvp/[slug]/sign-in`;
  - from 3-02: `GET / PUT /api/v1/rsvp/[slug]/household`, and the type `HouseholdView`.
- **Produces:** pages only.

## Files
| File | New / changed | What |
|---|---|---|
| `src/app/r/[slug]/page.tsx` | new | thin server page: `const { slug } = await params`, then `<SignInClient slug={slug}/>` |
| `src/app/r/[slug]/SignInClient.tsx` | new | client component; details below |
| `src/app/r/[slug]/form/page.tsx` + `FormClient.tsx` | new | same split |
| `src/app/r/[slug]/done/page.tsx` + `DoneClient.tsx` | new | same split |

**SignInClient:**
- `useQuery(["rsvp", slug], () => api("/api/v1/rsvp/" + slug))`.
- A 404 shows "RSVP not found". Status `upcoming` shows "Not open yet. Opens <date>"; `closed` shows "This RSVP is closed".
- Otherwise it shows an antd `Form` with "File No" (numeric keyboard: `inputMode="numeric"`) and the ITS input with its label, plus a "Continue" button.
- `useMutation` POSTs to sign-in. Success does `router.push("/r/"+slug+"/form")`. On error it shows `ApiError.message` in an `Alert`, which covers the 401 "don't match" and 429 cases.

**FormClient:**
- `useQuery(["household", slug], …)`. An `ApiError` 401 does `router.replace("/r/"+slug)`.
- Header: File No, HOF name, sector · sub-sector, and "Last saved <date>" when `lastSavedAt` is set.
- `<HouseholdForm mode="household">`. The PUT mutation:
  - 422 → pass `details` as `serverErrors` and show a top `Alert` with the message;
  - 403 → show "This RSVP is closed";
  - 401 → back to sign-in;
  - success → `router.push("/r/"+slug+"/done")`.

**DoneClient:**
- GET the household (401 goes to sign-in). Shows "Thank you, your answers are saved", then one card per member (and household) listing `label: value` for the visible fields with answers. Multiselect values are joined with ", ", and checkboxes show Yes/No.
- "Edit answers" is a `<Link prefetch={false}>` to `/form`, shown while `formStatus` is open.

## Steps
- [ ] 1. Build the three pages per Files. There are no unit tests: the logic they use is tested in 3-01, 3-02 and 5-02, and the pages are covered by e2e in 7-01.
- [ ] 2. Run `npm run lint`, `npm test` and `npm run build`. Expected: clean.
- [ ] 3. Do the manual test below.
- [ ] 4. Commit: `feat: household sign-in, form and thank-you pages`.

## Manual test
On `aem-dev`, with the invitee rows from 4-01's manual test (or add 2–3 members of one real file through `POST .../invitees`), and the browser at 375 px wide (DevTools device mode):
1. `/r/sample-rsvp` shows the title and DEV DATA. Wrong ITS → "File number and ITS don't match".
2. Correct file no + HOF ITS → the form, with one card per invited member and the Household card first.
3. Submit empty → errors, and the page scrolls to the first card. Fill in every card and submit → `/done` with the summary.
4. "Edit answers" → the form is prefilled. Change one answer and submit → the summary shows the change.
5. Wait 30 min, or delete the `rsvp_household` cookie, and reload `/form` → back to sign-in.

## Open questions
None.

## Out of scope
Admin pages (phase 6).
