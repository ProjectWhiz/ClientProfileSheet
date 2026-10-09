# Client Profile Sheet (React + Supabase)

This project is an interactive web version of your Client Profile Form.

When an associate submits the form:
- The full submission is saved to Supabase in `client_profile_submissions`.
- An email copy is sent to your service inbox: `service@1ststepbranding.com`.
- The email includes an `.xlsx` attachment with the submitted profile fields.

## Stack

- Frontend: React + Vite
- Backend: Supabase Edge Function
- Email provider: Resend API (used by the Edge Function)

## 1) Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
cp .env.example .env
```

If you are on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill `.env` values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

4. Start frontend:

```bash
npm run dev
```

## 2) Create your Supabase project

1. Go to https://supabase.com and create a new project.
2. Save your:
- Project URL
- Anon key
- Service role key

You can find these in Supabase dashboard:
- `Project Settings` -> `API`

## 3) Create the database table

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.client_profile_submissions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  company_name text,
  contact_name text,
  client_email text,
  selected_services text[] not null default '{}',
  payload jsonb not null
);

alter table public.client_profile_submissions enable row level security;

create policy "Allow read for authenticated users"
on public.client_profile_submissions
for select
to authenticated
using (true);
```

Notes:
- Insert is done by the Edge Function using service role key (bypasses RLS).
- You can add more policies later if you want dashboard/API reads by other roles.

## 4) Set up Resend (email service)

Supabase does not send arbitrary business emails by itself, so this project uses Resend in the Edge Function.

1. Create account at https://resend.com
2. Verify a sending domain or sender identity.
3. Create an API key in Resend.
4. Decide the `from` email address, for example:
- `forms@1ststepbranding.com`

## 5) Deploy the Supabase Edge Function

### Install Supabase CLI

Pick one option:

- Docs: https://supabase.com/docs/guides/cli
- npm:

```bash
npm i -g supabase
```

### Link your local project

From project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### Set function secrets

```bash
supabase secrets set SERVICE_EMAIL=service@1ststepbranding.com
supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
supabase secrets set RESEND_FROM_EMAIL=forms@1ststepbranding.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### Deploy function

```bash
supabase functions deploy submit-client-profile
```

## 6) Test end-to-end

1. Ensure frontend `.env` has URL + anon key.
2. Run `npm run dev`.
3. Open app, fill form, submit.
4. Confirm:
- Success message appears.
- Row exists in `client_profile_submissions` table.
- Email received at `service@1ststepbranding.com`.

Internal workflow note:
- The form is intended for internal associate use.
- Submission emails are sent only to `service@1ststepbranding.com`.
- The client email field is stored with the submission when provided but is not used as an outbound recipient.

## 7) Important operational notes

- If email sending fails, submission will fail and return error.
- The Edge Function receives all form data and stores the full payload in `payload` JSON.
- If you need a custom email template later, edit:
  - `supabase/functions/submit-client-profile/index.ts`

## 8) Project structure

- `src/App.jsx`: interactive client profile form
- `src/lib/supabaseClient.js`: Supabase frontend client
- `supabase/functions/submit-client-profile/index.ts`: backend submit + email logic
- `supabase/migrations/20261007000000_create_client_profile_submissions.sql`: table schema

## 9) What you still need to provide

To fully activate this in production, you need:
- Supabase project URL
- Supabase anon key
- Supabase service role key
- Resend API key
- Resend verified sender email/domain

Once those are added, the current code is ready to run.

## 10) Master Workbook Manual Pull (URL + Storage)

This project includes a second Edge Function that builds a master workbook from all submissions:

- Function: `export-client-profiles-master`
- Workbook output path: `exports/client-profiles-master.xlsx` (Supabase Storage)
- Sheets included:
  - `All Submissions` (all rows)
  - one sheet per client (grouped by company/contact)

### Deploy the export function

```bash
supabase functions deploy export-client-profiles-master
```

### Optional: protect URL access with a token

Set a secret token once:

```bash
supabase secrets set EXPORT_ACCESS_TOKEN=YOUR_LONG_RANDOM_TOKEN
```

Redeploy after setting the token:

```bash
supabase functions deploy export-client-profiles-master
```

### Manual pull via URL (JSON response with signed download link)

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/export-client-profiles-master?token=YOUR_LONG_RANDOM_TOKEN
```

### Direct download URL pull (HTTP redirect to signed file)

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/export-client-profiles-master?download=1&token=YOUR_LONG_RANDOM_TOKEN
```

Notes:

- Signed links expire automatically (default 30 minutes).
- If `EXPORT_ACCESS_TOKEN` is not set, the endpoint is open to anyone with the URL.
- Storage fallback always exists: you can download the latest workbook from the `exports` bucket in Supabase dashboard.
