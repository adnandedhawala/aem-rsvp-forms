# 1-01 Form definitions, answer checking, registry

Status: Planned · 6 Nov 2026
Kind: new · Spec: 3 (a form file) · Depends on: 0-01

## Decide
- A form is a TypeScript file in `forms/` built with `defineForm`. A bad form (duplicate field name, bad slug, a select without options, bad dates) **fails at build time**.
- `validateAnswers` is the one place answers are checked. Pages (5-02) and the API (3-02) both use it.
- Hidden fields (`visibleIf` false) and keys the form doesn't define are **dropped**, never stored.
- Field names must be unique across household and member fields, so admin grid columns never clash.
- Adds `forms/sample-rsvp.ts`, the spec section 3 example, open 2026–2030, used by dev and e2e.
- No blocking questions.

## Builder context
- Spec 3: the example and the bullets. Dev plan §3: field `name` is the key; forms hold functions.

## Interfaces
- **Consumes:** none.
- **Produces** (`forms/_fields.ts`):
  ```ts
  type FieldType = "text"|"textarea"|"number"|"radio"|"select"|"multiselect"|"checkbox"|"date";
  type Answers = Record<string, unknown>;
  interface FieldDef { name: string; label: string; type: FieldType; required?: boolean;
    options?: string[]; min?: number; max?: number; maxLength?: number;
    placeholder?: string; help?: string; visibleIf?: (values: Answers) => boolean; }
  type MemberInfoKey = "full_name"|"age"|"gender"|"mobile"|"hof_fm_type";
  type SignInIts = "hof"|"member"|"either";
  interface FormInput { slug: string; title: string; description?: string; opensAt: string; closesAt: string;
    signIn?: { its?: SignInIts; mustBeInvited?: boolean };
    householdFields?: FieldDef[]; memberFields: FieldDef[]; showMemberInfo?: MemberInfoKey[]; }
  interface FormDef { slug: string; title: string; description?: string; opensAt: string; closesAt: string;
    opensAtDate: Date; closesAtDate: Date; signIn: { its: SignInIts; mustBeInvited: boolean };
    householdFields: FieldDef[]; memberFields: FieldDef[]; showMemberInfo: MemberInfoKey[]; }
  function defineForm(input: FormInput): FormDef;
  function isFieldVisible(field: FieldDef, values: Answers): boolean;
  type ValidationResult = { ok: true; data: Answers } | { ok: false; errors: Record<string, string> };
  function validateAnswers(fields: FieldDef[], raw: Answers): ValidationResult;
  type PublicFieldDef = Omit<FieldDef, "visibleIf">;
  function toPublicFields(fields: FieldDef[]): PublicFieldDef[];   // for JSON responses (4-02)
  ```
- **Produces** (`forms/index.ts`): `forms: FormDef[]`, `getForm(slug: string): FormDef | undefined`, `listForms(): FormDef[]`, `type FormStatus = "upcoming"|"open"|"closed"`, `formStatus(form: FormDef, now?: Date): FormStatus` (open when `opensAtDate <= now < closesAtDate`).

**`defineForm` rules** (throws `Error`):
- the slug matches `/^[a-z0-9]+(-[a-z0-9]+)*$/`;
- `opensAt` and `closesAt` parse, with `opensAt < closesAt`;
- each field `name` matches `/^[a-z][a-z0-9_]*$/` and is unique across both lists. The error is `duplicate field name "<name>"`;
- `radio`/`select`/`multiselect` need a non-empty `options`.

Defaults: `signIn = { its: "either", mustBeInvited: false }`, `householdFields = []`, `showMemberInfo = ["full_name","age","gender"]`.

**`validateAnswers` rules:** it builds a Zod object from the **visible** fields only (`isFieldVisible(field, raw)`). Per type:
- text/textarea → trimmed string, `maxLength`;
- number → `z.coerce.number()` with min/max;
- radio/select → one of `options`;
- multiselect → an array of `options`;
- checkbox → boolean, default `false`;
- date → a `YYYY-MM-DD` string.

Missing means `undefined`, `null`, `""`, or `[]` for multiselect. A required field that's missing gives `"<label> is required"`. An optional missing field is omitted from `data`. Errors are keyed by `name`: the first message per field.

## Files
| File | New / changed | What |
|---|---|---|
| `forms/_fields.ts` | new | above |
| `forms/index.ts` | new | registry; `forms = [sampleRsvp]`; throws at import if two forms share a slug |
| `forms/sample-rsvp.ts` | new | spec 3 example with `slug: "sample-rsvp"`, `title: "Sample RSVP"`, `opensAt: "2026-01-01T00:00:00+05:30"`, `closesAt: "2030-12-31T23:59:59+05:30"` |
| `forms/_fields.test.ts`, `forms/index.test.ts` | new | tests below |

## Steps
- [ ] 1. Write the failing tests in `_fields.test.ts`:
  - A duplicate `name` across household and member fields throws `duplicate field name "x"`.
  - Slug `"Bad Slug"` throws; a select without options throws; `closesAt` before `opensAt` throws.
  - Defaults: `signIn.its === "either"` and `mustBeInvited === false`.
  - `validateAnswers(sample.memberFields, { attending: "No", days: "All", hacker: 1 })` deep-equals `{ ok: true, data: { attending: "No", needs_wheelchair: false } }`.
  - `validateAnswers(sample.memberFields, { attending: "Yes" })` gives `ok: false` with `errors.days === "Which days? is required"`.
  - `{ attending: "Maybe" }` gives `ok: false` with `errors.attending` defined.
  - `validateAnswers(sample.householdFields, { mehmaan_count: "3" })` gives `data.mehmaan_count === 3`; `"25"` gives `ok: false` (max 20); `{}` gives `ok: true` with `data: {}`.
  - `toPublicFields` strips `visibleIf`, and `JSON.stringify` of the result round-trips.
- [ ] 2. Write the failing tests in `index.test.ts`:
  - `getForm("sample-rsvp")` is defined and `getForm("nope")` is undefined.
  - `formStatus(form, new Date("2025-06-01"))` is `"upcoming"`, at `2027-01-01` it's `"open"`, and at `2031-01-01` it's `"closed"`.
- [ ] 3. Run `npx vitest run forms`. Expected: FAIL.
- [ ] 4. Implement per Interfaces.
- [ ] 5. Run the tests (PASS), `npm run lint` and `npm run build`.
- [ ] 6. Commit: `feat: form definitions, answer validation, registry`.

## Manual test
None: covered by tests.

## Open questions
None.

## Out of scope
Rendering (5-02). Storing answers (3-02).
