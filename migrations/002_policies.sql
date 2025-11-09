-- =====================================================================
-- Row Level Security (RLS) Policies for Doctor Portal
-- Version: 002
-- Description: Comprehensive RLS policies for secure data access
-- =====================================================================

-- Enable RLS on all tables
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.appointments enable row level security;
alter table public.reports enable row level security;
alter table public.consents enable row level security;
alter table public.messages enable row level security;
alter table public.audit_log enable row level security;

-- =====================================================================
-- PATIENTS POLICIES
-- =====================================================================

-- Patients can view their own profile
create policy patients_select_own on public.patients
  for select
  using (auth.uid() = user_id);

-- Doctors can view patient profiles only with active consent
create policy patients_select_by_doctor on public.patients
  for select
  using (
    exists (
      select 1 from public.doctors d
      inner join public.consents c on c.doctor_id = d.id
      where d.user_id = auth.uid()
        and c.patient_id = public.patients.id
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
    )
  );

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
-- DOCTORS POLICIES
-- =====================================================================

-- Anyone can view verified doctors (for booking)
create policy doctors_select_verified on public.doctors
  for select
  using (is_verified = true);

-- Doctors can view their own profile
create policy doctors_select_own on public.doctors
  for select
  using (auth.uid() = user_id);

-- Doctors can insert their own profile (during signup)
create policy doctors_insert_own on public.doctors
  for insert
  with check (auth.uid() = user_id);

-- Doctors can update their own profile (except is_verified)
create policy doctors_update_own on public.doctors
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (old.is_verified = new.is_verified) -- Cannot change verification status
  );

-- Note: is_verified can only be changed by admin via service role
-- This is enforced by edge functions or backend processes

-- =====================================================================
-- APPOINTMENTS POLICIES
-- =====================================================================

-- Patients can view their own appointments
create policy appointments_select_patient on public.appointments
  for select
  using (
    exists (
      select 1 from public.patients p
      where p.id = public.appointments.patient_id
        and p.user_id = auth.uid()
    )
  );

-- Doctors can view their own appointments
create policy appointments_select_doctor on public.appointments
  for select
  using (
    exists (
      select 1 from public.doctors d
      where d.id = public.appointments.doctor_id
        and d.user_id = auth.uid()
    )
  );

-- Patients can create appointments
create policy appointments_insert_patient on public.appointments
  for insert
  with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.user_id = auth.uid()
    )
    and status = 'scheduled'
  );

-- Patients can update their own appointments (limited fields)
create policy appointments_update_patient on public.appointments
  for update
  using (
    exists (
      select 1 from public.patients p
      where p.id = public.appointments.patient_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patients p
      where p.id = public.appointments.patient_id
        and p.user_id = auth.uid()
    )
    -- Patients can only update notes and status (cancel)
    and (
      status in ('scheduled', 'cancelled')
      or old.status = new.status
    )
    and old.doctor_id = new.doctor_id
    and old.scheduled_at = new.scheduled_at
  );

-- Doctors can update their appointments (confirmation, notes, status)
-- Only verified doctors can confirm appointments
create policy appointments_update_doctor on public.appointments
  for update
  using (
    exists (
      select 1 from public.doctors d
      where d.id = public.appointments.doctor_id
        and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.doctors d
      where d.id = public.appointments.doctor_id
        and d.user_id = auth.uid()
        and (
          -- If confirming or starting, must be verified
          (new.status in ('confirmed', 'in_progress', 'completed') and d.is_verified = true)
          or new.status not in ('confirmed', 'in_progress', 'completed')
        )
    )
    and old.patient_id = new.patient_id
    and old.doctor_id = new.doctor_id
    and old.scheduled_at = new.scheduled_at
  );

-- =====================================================================
-- REPORTS POLICIES
-- =====================================================================

-- Patients can view their own reports
create policy reports_select_patient_own on public.reports
  for select
  using (
    exists (
      select 1 from public.patients p
      where p.id = public.reports.patient_id
        and p.user_id = auth.uid()
    )
  );

-- Doctors can view reports only with active consent
create policy reports_select_doctor_with_consent on public.reports
  for select
  using (
    exists (
      select 1 from public.doctors d
      inner join public.consents c on c.doctor_id = d.id
      where d.user_id = auth.uid()
        and c.patient_id = public.reports.patient_id
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and (
          c.report_id is null  -- General consent for all reports
          or c.report_id = public.reports.id  -- Specific report consent
        )
    )
  );

-- Alternative: Doctor can view specific report with specific consent
create policy reports_select_specific_consent on public.reports
  for select
  using (
    auth.uid() = uploaded_by
    or exists (
      select 1 from public.consents c
      inner join public.doctors d on d.id = c.doctor_id
      where c.report_id = public.reports.id
        and c.granted = true
        and d.user_id = auth.uid()
        and (c.expires_at is null or c.expires_at > now())
    )
  );

-- Patients can insert their own reports
create policy reports_insert_patient_only on public.reports
  for insert
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.user_id = auth.uid()
    )
  );

-- Patients can update their own reports (before sharing)
create policy reports_update_patient on public.reports
  for update
  using (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.patients p
      where p.id = public.reports.patient_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = uploaded_by
    and old.patient_id = new.patient_id
  );

-- Doctors can update reports (add annotations, AI summary) only with consent
create policy reports_update_doctor on public.reports
  for update
  using (
    exists (
      select 1 from public.doctors d
      inner join public.consents c on c.doctor_id = d.id
      where d.user_id = auth.uid()
        and c.patient_id = public.reports.patient_id
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and (c.report_id is null or c.report_id = public.reports.id)
    )
  )
  with check (
    exists (
      select 1 from public.doctors d
      inner join public.consents c on c.doctor_id = d.id
      where d.user_id = auth.uid()
        and c.patient_id = public.reports.patient_id
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and (c.report_id is null or c.report_id = public.reports.id)
    )
    and old.patient_id = new.patient_id
    and old.uploaded_by = new.uploaded_by
  );

-- =====================================================================
-- CONSENTS POLICIES
-- =====================================================================

-- Patients can view their own consents
create policy consents_select_patient on public.consents
  for select
  using (
    exists (
      select 1 from public.patients p
      where p.id = public.consents.patient_id
        and p.user_id = auth.uid()
    )
  );

-- Doctors can view consents granted to them
create policy consents_select_doctor on public.consents
  for select
  using (
    exists (
      select 1 from public.doctors d
      where d.id = public.consents.doctor_id
        and d.user_id = auth.uid()
    )
  );

-- Patients can insert consents (grant access)
create policy consents_insert_patient on public.consents
  for insert
  with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.user_id = auth.uid()
    )
  );

-- Patients can update their own consents (revoke access)
create policy consents_update_patient on public.consents
  for update
  using (
    exists (
      select 1 from public.patients p
      where p.id = public.consents.patient_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patients p
      where p.id = public.consents.patient_id
        and p.user_id = auth.uid()
    )
    and old.patient_id = new.patient_id
    and old.doctor_id = new.doctor_id
  );

-- =====================================================================
-- MESSAGES POLICIES
-- =====================================================================

-- Users can view messages they sent
create policy messages_select_sender on public.messages
  for select
  using (auth.uid() = sender_id);

-- Users can view messages they received
create policy messages_select_recipient on public.messages
  for select
  using (auth.uid() = recipient_id);

-- Users can send messages to doctors with active appointments
create policy messages_insert_patient_to_doctor on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.patients p
      inner join public.appointments a on a.patient_id = p.id
      inner join public.doctors d on d.id = a.doctor_id
      where p.user_id = auth.uid()
        and d.user_id = recipient_id
        and a.status in ('confirmed', 'in_progress', 'completed')
        and a.scheduled_at > now() - interval '7 days'
    )
  );

-- Doctors can send messages to their patients
create policy messages_insert_doctor_to_patient on public.messages
  for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.doctors d
      inner join public.appointments a on a.doctor_id = d.id
      inner join public.patients p on p.id = a.patient_id
      where d.user_id = auth.uid()
        and p.user_id = recipient_id
        and a.status in ('confirmed', 'in_progress', 'completed')
        and a.scheduled_at > now() - interval '7 days'
    )
  );

-- Users can update messages they received (mark as read)
create policy messages_update_recipient on public.messages
  for update
  using (auth.uid() = recipient_id)
  with check (
    auth.uid() = recipient_id
    and old.sender_id = new.sender_id
    and old.recipient_id = new.recipient_id
    and old.content = new.content
  );

-- =====================================================================
-- AUDIT_LOG POLICIES
-- =====================================================================

-- Users can view their own audit logs
create policy audit_select_own on public.audit_log
  for select
  using (auth.uid() = actor);

-- Doctors can view audit logs related to their patients (with consent)
create policy audit_select_doctor on public.audit_log
  for select
  using (
    exists (
      select 1 from public.doctors d
      inner join public.consents c on c.doctor_id = d.id
      inner join public.patients p on p.id = c.patient_id
      where d.user_id = auth.uid()
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and (
          public.audit_log.actor = p.user_id
          or public.audit_log.meta->>'patient_id' = p.id::text
        )
    )
  );

-- Anyone can insert audit logs (logging is universal)
create policy audit_insert_any on public.audit_log
  for insert
  with check (true);

-- =====================================================================
-- SERVICE ROLE BYPASS
-- =====================================================================

-- Note: Edge functions using service role bypass RLS
-- They must implement their own authorization logic and always log to audit_log
-- This ensures:
-- 1. AI processing can access reports after consent verification
-- 2. System operations (notifications, scheduled tasks) can proceed
-- 3. All operations are logged for compliance

-- =====================================================================
-- COMMENTS
-- =====================================================================

comment on policy patients_select_own on public.patients is 'Patients can view their own profile';
comment on policy patients_select_by_doctor on public.patients is 'Doctors can view patient profiles only with active consent';
comment on policy reports_select_doctor_with_consent on public.reports is 'Doctors can view reports only with valid patient consent';
comment on policy appointments_update_doctor on public.appointments is 'Only verified doctors can confirm or start appointments';
comment on policy consents_update_patient on public.consents is 'Patients control consent grants and revocations';
