# Change request: View-only access to the admin portal

- **Kind:** new
- **Name:** view-only-access
- **Area:** admin pages · API · db
- **Date:** 06/11/2026

## 1. Why
Some people (for example the jaman or Darees organisers) need to see who is coming and download the lists, but must not invite, remove, edit answers or close an RSVP. Today the admin portal is all or nothing: only users with the `Admin` role can sign in.

## 2. What it should do
- **Viewers page** (`/admin/viewers`, admins only): a list of viewers (ITS, name, added by, added on). An admin adds a viewer by ITS and removes one with a confirm. The ITS must belong to a user in the AEM `user` collection, otherwise "No AEM user with this ITS".
- **Sign-in:** a viewer signs in on `/admin/login` with their usual AEM ITS or email and password. Users who are neither admin nor viewer still get "Not an admin".
- **What a viewer can do,** on every RSVP:
  - see the RSVP list with counts;
  - see the invitees list and download it as Excel;
  - see the responses grid, filter it and download it as Excel;
  - open a household's answers read-only.
- **What a viewer can't do:** add or remove invitees, edit or submit answers, close or reopen, open the Viewers page. The buttons are hidden, and the API refuses with 403 "View-only access".
- The header shows "View only" next to the viewer's name.
- A removed viewer loses access on their next request, without waiting for their sign-in to expire.

## 3. Data
No new collection. One `rsvp_entry` row per viewer: `rsvp: "*"` (not a form slug), `kind: "viewer"`, `member_id` = the viewer's ITS, `invited_by` = the admin, `is_removed` for removal. Users are only read from `user`.

## 4. Changes to existing behaviour
- The admin sign-in token carries a role (`admin` or `viewer`). Tokens issued before this change count as `admin` (only admins could get one).
- Every admin API route says whether viewers may call it (reads) or only admins (writes).

## 5. How I'll test it
1. As an admin, add a viewer on `/admin/viewers`.
2. Sign in as that viewer: the RSVP list shows, with no Close button and no Viewers link.
3. Open invitees and responses: lists and downloads work, there's no add/remove grid and no edit.
4. Call an admin write API as the viewer: 403.
5. Remove the viewer as admin: the viewer's next page load sends them to sign-in.

## 6. Not in this request
- Viewers limited to some RSVPs.
- Hiding columns (such as mobile numbers) from viewers.
