# 5-02 Form renderer

Status: Built · 6 Nov 2026
Kind: new · Spec: 3, 5 step 2, 4.4 (admin mode) · Depends on: 3-02 (types), 5-01

## Decide
- `HouseholdForm` draws any form from its file: a household card (if there are household fields), then one card per invited member, then **one Submit**.
- The browser checks with the same `validateAnswers` as the server. With any error, nothing is sent and the page scrolls to the first bad card.
- Server errors (422 details) are shown on the matching cards.
- In admin mode the same form shows an "Editing as admin" tag.
- The component looks the form up by slug itself; it never receives a form object from a server component.
- No blocking questions.

## Builder context
- Spec 3 (field types), 5 step 2.
- Dev plan §3: forms hold functions.

## Interfaces
- **Consumes:** `getForm`, `FieldDef`, `Answers`, `validateAnswers`, `isFieldVisible`, `MemberInfoKey` (1-01). The types only, `HouseholdView` and `HouseholdPayload`, from `src/server/services/households.ts` (3-02): import with `import type` so no server code reaches the browser.
- **Produces** (client components in `src/components/form/`):
  - `FieldInput(props: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string })`. Each type maps to an antd control:
    - text → `Input`; textarea → `Input.TextArea`; number → `InputNumber` (min/max);
    - radio → `Radio.Group optionType="button"`; select → `Select`; multiselect → `Select mode="multiple"`;
    - checkbox → `Checkbox`; date → `DatePicker`, stored as `YYYY-MM-DD` with dayjs.

    It renders `label` (with `*` when required), `help`, and `error` in red.
  - `AnswerCard(props: { id: string; title: string; subtitle?: string; fields: FieldDef[]; values: Answers; errors?: Record<string, string>; onChange: (name: string, v: unknown) => void })` renders only the visible fields. The card root has `id={id}` and `data-testid={id}`.
  - `HouseholdForm(props: { formSlug: string; view: HouseholdView; mode: "household" | "admin"; submitting: boolean; serverErrors?: { household?: Record<string,string>; members?: Record<string, Record<string,string>> }; onSubmit: (p: HouseholdPayload) => void })`:
    - cards are `card-household` (title "Household") and `card-<its>` (title = `full_name`, subtitle = the `showMemberInfo` values joined with " · ");
    - initial values come from `view.household?.data` and `members[i].data`;
    - Submit (disabled while `submitting`) validates every card. On errors it sets them and calls `document.getElementById(firstErrorId)?.scrollIntoView({ behavior: "smooth" })`; otherwise it calls `onSubmit({ household?: data, members: { [its]: data } })`, with `household` only when the form has household fields.

## Files
| File | New / changed | What |
|---|---|---|
| `src/components/form/{FieldInput,AnswerCard,HouseholdForm}.tsx` | new | above |
| `src/components/form/HouseholdForm.test.tsx` | new | `// @vitest-environment jsdom`; tests below |
| `vitest.setup.ts` | new | `import "@testing-library/jest-dom/vitest"`; stub `window.matchMedia` (antd needs it) and `Element.prototype.scrollIntoView` |
| `vitest.config.ts` | changed | `setupFiles: ["vitest.setup.ts"]` |

## Steps
- [ ] 1. Write the failing tests. Render `HouseholdForm formSlug="sample-rsvp"` with a view of 2 members (`10000001` "Member 10000001", `10000002` "Member 10000002"), `data: null` and `household: { data: null, submitted_at: null }`.
  - Three cards: `card-household`, `card-10000001` and `card-10000002`; both names visible.
  - "Which days?" isn't present in `card-10000001` until "Yes" is clicked inside it.
  - Submit with nothing filled: `onSubmit` isn't called, and "Will attend? is required" appears twice.
  - Choose "No" in both cards and submit: `onSubmit` is called once with exactly `{ household: {}, members: { "10000001": { attending: "No", needs_wheelchair: false }, "10000002": { attending: "No", needs_wheelchair: false } } }`.
  - Prefill: a view with `10000001.data = { attending: "Yes", days: "All" }` shows "Yes" selected and "Which days?" visible with "All".
  - `serverErrors={{ members: { "10000002": { attending: "Not allowed" } } }}` shows "Not allowed" inside `card-10000002`.
  - `mode="admin"` shows "Editing as admin".
- [ ] 2. Run them. Expected: FAIL.
- [ ] 3. Implement per Interfaces.
- [ ] 4. Run them (PASS), `npm run lint` and `npm run build`.
- [ ] 5. Commit: `feat: household form renderer`.

## Manual test
None: covered by tests. It's seen for real in 5-03.

## Open questions
None.

## Out of scope
Pages and data loading (5-03, 6-03).
