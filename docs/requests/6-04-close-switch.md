# Change request: Admin close and reopen switch

- **Kind:** new
- **Name:** close-switch
- **Area:** admin pages · API · db
- **Date:** 06/11/2026

## 1. Why
An RSVP like the TNC Darees has no fixed end. It stays open until the jamaat says stop. Today the only way to close a form is to change `closesAt` in the form file and redeploy, which needs a developer. Admins need to close (and reopen) an RSVP themselves, straight away.

## 2. What it should do
- On `/admin` (the RSVP list), every form gets a **Close** button, or **Reopen** if an admin closed it. Each asks "Close this RSVP? Households won't be able to submit." / "Reopen this RSVP?" before acting.
- Admins only. Anyone else gets 401/403 like the other admin APIs.
- Closed by an admin works exactly like closed by date: the sign-in page shows "This RSVP is closed", households can't sign in or submit, the done page hides **Edit answers**, and the home page skips it.
- Admins can still see and edit responses of a closed RSVP (as today).
- **Reopen** only takes away the admin's close. If `closesAt` has passed, the form stays closed by date. If `opensAt` hasn't come, it stays upcoming.
- The status tag on `/admin` says `closed` and, when an admin closed it, shows who and when on hover.

## 3. Data
No new collection. One `rsvp_entry` row per RSVP with `kind: "control"`, holding `data: { closed: true | false }`, and `invited_by` set to the admin's ITS who last changed it (`updatedAt` gives when). No row means not closed by an admin.

## 4. Changes to existing behaviour
- `rsvp_entry.kind` allows `"control"` as well as `"member"` and `"household"`.
- Every place that decides "is this form open" asks the server, which combines the dates with the admin switch. Pages that worked this out in the browser from the form file (the done page) get it from the API instead.

## 5. How I'll test it
1. On `aem-dev`, close `sample-rsvp` from `/admin`. The tag says closed.
2. Open `/r/sample-rsvp`: "This RSVP is closed". Signing in is refused.
3. Admin opens a household from the responses page and saves: it works.
4. Reopen: the household can sign in and submit again.

## 6. Not in this request
- Scheduling a close for a later time from the admin pages (use `closesAt`).
- Opening a form before its `opensAt`.
- An audit history of who closed and reopened when (only the last change is kept).
