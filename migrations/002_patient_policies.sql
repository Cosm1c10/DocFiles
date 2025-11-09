-- =====================================================================
-- Row Level Security (RLS) Policies for Patient Portal
-- Version: 002
-- Description: RLS policies for secure patient data access
-- =====================================================================

-- Enable RLS on all tables
alter table public.patients enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;

-- =====================================================================
-- PATIENTS POLICIES
-- =====================================================================

-- Patients can view their own profile
create policy patients_select_own on public.patients
  for select
  using (auth.uid() = user_id);

-- Patients can insert their own profile (during signup)
create policy patients_insert_own on public.patients
  for insert
  with check (auth.uid() = user_id);

-- Patients can update their own profile
create policy patients_update_own on public.patients
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================================
-- REPORTS POLICIES
-- =====================================================================

-- Patients can view their own reports
create policy reports_select_own on public.reports
  for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can insert their own reports
create policy reports_insert_own on public.reports
  for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
    and uploaded_by = auth.uid()
  );

-- Patients can update their own reports
create policy reports_update_own on public.reports
  for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can delete their own reports
create policy reports_delete_own on public.reports
  for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- =====================================================================
-- AUDIT_LOG POLICIES
-- =====================================================================

-- Users can view their own audit logs
create policy audit_select_own on public.audit_log
  for select
  using (actor = auth.uid());

-- System can insert audit logs (done via service role)
-- No insert policy for regular users
