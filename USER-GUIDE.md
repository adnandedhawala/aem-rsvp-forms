# AEM RSVP: How to use it

There are two kinds of people:

- **Admins** set up who is invited and see or edit the responses.
- **Households** sign in with their file number and ITS and fill in one form for every invited member.

Each RSVP (an event, a registration, a survey) is a **form** with its own link.

---

## Part 1: Admin guide

### 1. Add a new RSVP (developer step)

There is no form-builder screen. A developer adds one file and deploys.

1. Copy `forms/sample-rsvp.ts` to `forms/<slug>.ts`.
2. Set the slug, title, description, `opensAt`, `closesAt`, `signIn` and the questions.
3. Add one line in `forms/index.ts`.
4. Run `npm test` and `npm run build`. A bad form fails the build.
5. Push to `main`. Vercel deploys it to production.

Things to know:

- The household link is `/r/<slug>`.
- The RSVP opens and closes on the dates in the form file. An admin can also close it at any time from `/admin` (see below). For an RSVP with no end date, set `closesAt` far ahead (for example 2099): households then see no close date.
- **Never rename a field `name` after people have answered.** The name is the key for the stored answers.

### 2. Log in

1. Go to `/admin/login`.
2. Enter your ITS or email, and your password.
3. Only users with the `Admin` role get in. Admin accounts are managed in AEM, not in this app.
4. Too many wrong attempts will lock the login for a while.
5. Your session lasts about 12 hours.

### 3. See your RSVPs

`/admin` lists every form with its status (upcoming, open or closed). It also shows how many files and members are invited and how many have responded.

**Close or reopen an RSVP:** click **Close** on its row and confirm. Households straight away see "This RSVP is closed" and can't sign in or submit. Admins can still view and edit responses. The tag shows `closed (by admin)`; hover it to see who closed it and when. Click **Reopen** to undo. Reopen only removes the admin's close: if the form's own dates have passed, it stays closed.

### 4. Invite people

Open an RSVP, then **Invitees** (`/admin/r/<slug>/invitees`). One row is one member. To invite a whole family, add a row for each member.

You can add people in three ways:

- **Type** into the grid. It has blank rows, and you can add more. Click a cell and start typing, or double-click to edit what is there.
- **Paste** from Excel into the grid. Click the top-left cell, then press Ctrl+V (Cmd+V on a Mac). Drag or Shift+click to select several cells.
- **Upload** an Excel or CSV file with an `its` column and, optionally, `file_no`.

The file number is optional. Leave it empty and it is filled in from the ITS.

Then:

1. Each row is checked. The ITS must exist, it must belong to that file, and there must be no duplicates. Bad rows turn red and show the reason. Good rows show the member's name, age, gender, HOF and sector. Clicking **Check rows** checks everything again and removes the empty rows.
2. Fix or delete the red rows.
3. Click **Save**.

Good to know:

- **Saving adds to the list.** It never wipes existing invitees or their answers.
- To **remove** people, select their rows and click Remove. If someone had already answered, you get a warning. Their answer is kept but hidden.
- You can search the current list, see counts, and download it as Excel.
- A single upload can have at most 5000 rows.

### 5. See the responses

Open **Responses** (`/admin/r/<slug>/responses`).

- There is one row per invited member, with file no, HOF, sector, ITS, name, age, gender, every form field, and when they submitted.
- Members who haven't answered show as **Pending**.
- Use the filters (sector, answered or pending, any field value) and the summary counts at the top.
- Click **Download** for an Excel export of the current view.

### 6. Fill in or change a household's answers

On the responses page, click **Open form** on a row. This opens the same form the family sees, for the whole file.

- Fill in or edit, then Submit. It uses the same checks as the household.
- Admins can save **even after the RSVP has closed**.
- These entries are marked as submitted by the admin, so you can tell them apart.

### 7. Give someone view-only access

Click **Viewers** in the top bar (admins only). Type the person's ITS and click **Add viewer**. They must already be a user in AEM.

- Viewers sign in on the same admin login, with their usual AEM ITS or email and password. The top bar shows **View only**.
- They can see every RSVP's list, invitees and responses, and download them as Excel. **View** on a response row shows that household's answers.
- They can't invite or remove people, change answers, or close or reopen an RSVP.
- Click **Remove** to take access away. It stops on their next page load.

---

## Part 2: Household guide (for members)

Send members the link for the RSVP, usually on WhatsApp. The form works well on a phone.

**Link:** `https://<your-site>/r/<slug>`

### 1. Sign in

1. Open the link.
2. You see the title, description and dates. If it says "Not open yet" or "Closed", you can't fill it in.
3. Enter your **file number** and your **ITS**. The label on the page says which ITS is accepted. Depending on the form it is the HOF's ITS, any member's ITS, or either.
4. Tap **Continue**.

If it says "File number and ITS don't match", check both numbers. Your file must also be on the invited list. If it still fails, contact the admin.

### 2. Fill in the form

- If the form asks household questions (for example the number of guests), they come first.
- Then there is **one section for every invited member** of your file. Members who weren't invited don't appear.
- Answer for each person. Some questions only appear after another answer, such as "Which days?" after "Will attend? Yes".
- If you filled the form before, your earlier answers are already there. You can review and change them.

### 3. Submit

- There is **one Submit button for the whole household**. Everything is checked and saved together.
- If something is missing, nothing is saved. The page scrolls to the first problem so you can fix it.
- After submitting, you see a thank-you page with a summary. While the RSVP is open you can use **Edit** to change your answers.

Your sign-in lasts about 30 minutes. If it expires, sign in again. Your saved answers will still be there.

---

## Quick reference

| Who | Where | What |
|---|---|---|
| Admin | `/admin/login` | Log in |
| Admin | `/admin` | List of RSVPs |
| Admin | `/admin/r/<slug>/invitees` | Add or remove invited members |
| Admin | `/admin/r/<slug>/responses` | View, filter, export, edit responses |
| Admin | `/admin/viewers` | Add or remove view-only users |
| Viewer | `/admin` and the pages under it | See and download, nothing else |
| Household | `/r/<slug>` | Sign in with file no + ITS |
| Household | `/r/<slug>/form` | Fill in for all invited members |

## Common problems

| Problem | Fix |
|---|---|
| A row is red on the invitees grid | The ITS isn't in AEM, or doesn't belong to that file. Correct it or remove the row. |
| A household can't sign in | Check they are on the invited list, the RSVP is open, and they are using the ITS type the form allows. |
| A member is missing from the household form | They weren't invited, or were removed. Add them on the invitees page. |
| A household needs a change after the RSVP closed | The admin can edit it with **Open form** on the responses page. |
| Need to close or reopen early | Use **Close** / **Reopen** on `/admin`. To open before `opensAt` or keep it open past `closesAt`, change the date in the form file and redeploy. |
