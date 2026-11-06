# Template: plan file (`docs/plans/<phase>-<NN>-<name>.md`)

A plan is one small, buildable piece of `RSVP-DEV-PLAN.md`. It is approved, built, tested, reviewed, then **deleted** (git keeps it). Keep it under 15 KB, every section present ("None" where it doesn't apply). Don't repeat the rules in `RSVP-DEV-PLAN.md` section 3: they always apply.

```markdown
# <phase>-<NN> <Title>

Status: Planned · <date>   (later: Approved · <date> → Built · <date> → Reviewed · <date>)
Kind: <new · change · fix> · Spec: <sections> · Depends on: <plan ids, or "none">

## Decide
At most 10 lines: what this adds, files touched, anything that changes earlier work, each blocking question with the recommended answer.

## Builder context
- Spec sections and dev-plan rules this implements, by number.
- Existing code it reads or copies from (paths).

## Interfaces
- **Consumes:** exact names/signatures from earlier plans.
- **Produces:** exact names/signatures later plans rely on.

## Files
| File | New / changed | What |
|---|---|---|

## Steps
- [ ] 1. Write the failing tests: test names + assertions with exact values.
- [ ] 2. Run them: command + expected FAIL.
- [ ] 3. Implement: signatures and the values the spec fixes; bodies only for algorithms the tests don't pin.
- [ ] 4. Run them: expected PASS; plus `npm run lint` and `npm run build`.
- [ ] 5. Commit: message.

## Manual test
Numbered steps on `aem-dev` (or "None: covered by tests").

## Open questions
Numbered, each with a recommended answer; **(blocks build)** where it does.

## Out of scope
```
