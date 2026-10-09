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
