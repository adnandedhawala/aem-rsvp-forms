# Change request: <short title>

Copy to `docs/requests/<phase>-<NN>-<name>.md` (`<phase>` from `RSVP-DEV-PLAN.md`, `<NN>` two digits in order of execution), fill it in in plain words, then ask Claude to write the plan from it. Leave out what you don't know: the plan turns gaps into open questions. Deleted with its plan once the work passes review (git keeps it), so commit it first.

**Adding a new RSVP form doesn't need a request.** That's a file in `forms/` plus one line in `forms/index.ts` (see README).

- **Kind:** <new · change · fix>
- **Name:** <name>
- **Area:** <household pages · admin pages · API · forms · db · deploy>
- **Date:** <DD/MM/YYYY>

## 1. Why
<What someone needs to do and why now. For a fix: what goes wrong, how to make it happen, what should happen instead.>

## 2. What it should do
<Screens, API calls or behaviour, step by step. Who can do it (household · admin). What it must refuse, and the message shown.>

## 3. Data
<What it reads or writes in `rsvp_entry` or the shared collections. Remember: no new collections without a decision.>

## 4. Changes to existing behaviour
<What works differently afterwards, or "None".>

## 5. How I'll test it
<Cases to try by hand on `aem-dev`.>

## 6. Not in this request
<Anything related that should wait.>
