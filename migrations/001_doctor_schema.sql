-- =====================================================================
-- Doctor Portal Schema Migration
-- Version: 001
-- Description: Core tables for doctor-patient workflow
-- =====================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =====================================================================
-- PATIENTS TABLE
-- =====================================================================
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group text,
  allergies text[] default '{}',
  chronic_conditions text[] default '{}',
  emergency_contact jsonb,
  address jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_patients_user_id on public.patients(user_id);
create index idx_patients_email on public.patients(email);

-- =====================================================================
-- DOCTORS TABLE
-- =====================================================================
create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  specialties text[] default '{}',
  license_number text unique,
  license_doc_path text,
  is_verified boolean default false,
  bio text,
  qualifications text[] default '{}',
  experience_years integer,
  consultation_fee numeric(10,2),
  working_hours jsonb,
  online boolean default false,
  rating numeric(3,2) default 0.0,
  total_consultations integer default 0,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_doctors_user_id on public.doctors(user_id);
create index idx_doctors_email on public.doctors(email);
create index idx_doctors_verified on public.doctors(is_verified) where is_verified = true;
create index idx_doctors_online on public.doctors(online) where online = true;
create index idx_doctors_specialties on public.doctors using gin(specialties);

-- =====================================================================
-- APPOINTMENTS TABLE
-- =====================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  appointment_type text default 'consultation'
    check (appointment_type in ('consultation', 'follow_up', 'emergency', 'routine_checkup')),
  meet_link text,
  patient_notes text,
  doctor_notes text,
  prescription_id uuid,
  fee_amount numeric(10,2),
  payment_status text default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded', 'failed')),
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_doctor on public.appointments(doctor_id);
create index idx_appointments_scheduled on public.appointments(scheduled_at);
create index idx_appointments_status on public.appointments(status);
create index idx_appointments_doctor_scheduled on public.appointments(doctor_id, scheduled_at);

-- =====================================================================
-- REPORTS TABLE
-- =====================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  appointment_id uuid references public.appointments(id),
  title text not null,
  description text,
  file_path text not null,
  file_mime text not null,
  file_size_bytes bigint,
  file_text text,
  ocr_processed boolean default false,
  ai_summary jsonb,
  ai_summary_raw text,
  ai_tags text[] default '{}',
  ai_processed_at timestamptz,
  annotations jsonb default '[]'::jsonb,
  report_date date,
  report_type text default 'lab_report'
    check (report_type in ('lab_report', 'imaging', 'prescription', 'medical_history', 'vaccination', 'other')),
  is_shared boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_reports_patient on public.reports(patient_id);
create index idx_reports_uploaded_by on public.reports(uploaded_by);
create index idx_reports_appointment on public.reports(appointment_id);
create index idx_reports_ai_tags on public.reports using gin(ai_tags);
create index idx_reports_created on public.reports(created_at desc);
create index idx_reports_type on public.reports(report_type);

-- =====================================================================
-- CONSENTS TABLE
-- =====================================================================
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  appointment_id uuid references public.appointments(id),
  granted boolean default false,
  consent_type text not null default 'report_access'
    check (consent_type in ('report_access', 'data_sharing', 'telemedicine', 'emergency_access')),
  scope text[] default '{}',
  expires_at timestamptz,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

create index idx_consents_patient on public.consents(patient_id);
create index idx_consents_doctor on public.consents(doctor_id);
create index idx_consents_report on public.consents(report_id);
create index idx_consents_granted on public.consents(granted) where granted = true;
create index idx_consents_active on public.consents(doctor_id, granted)
  where granted = true and (expires_at is null or expires_at > now());

-- =====================================================================
-- MESSAGES TABLE
-- =====================================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  appointment_id uuid references public.appointments(id),
  content text not null,
  message_type text default 'text'
    check (message_type in ('text', 'file', 'system', 'template')),
  file_path text,
  file_mime text,
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_recipient on public.messages(recipient_id);
create index idx_messages_appointment on public.messages(appointment_id);
create index idx_messages_created on public.messages(created_at desc);
create index idx_messages_unread on public.messages(recipient_id, read_at) where read_at is null;

-- =====================================================================
-- AUDIT_LOG TABLE
-- =====================================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_audit_actor on public.audit_log(actor);
create index idx_audit_entity on public.audit_log(entity, entity_id);
create index idx_audit_created on public.audit_log(created_at desc);
create index idx_audit_action on public.audit_log(action);

-- =====================================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger patients_updated_at before update on public.patients
  for each row execute function update_updated_at();

create trigger doctors_updated_at before update on public.doctors
  for each row execute function update_updated_at();

create trigger appointments_updated_at before update on public.appointments
  for each row execute function update_updated_at();

create trigger reports_updated_at before update on public.reports
  for each row execute function update_updated_at();

-- =====================================================================
-- SEED DATA: Demo Doctor and Patient
-- =====================================================================

-- Note: These UUIDs must correspond to actual auth.users entries
-- In production, create these users via Supabase Auth first
-- For demo purposes, we'll use placeholder UUIDs that you'll replace

-- Demo Doctor (replace user_id with actual auth.users UUID after signup)
insert into public.doctors (
  id,
  user_id,
  full_name,
  email,
  phone,
  specialties,
  license_number,
  is_verified,
  bio,
  qualifications,
  experience_years,
  consultation_fee,
  working_hours,
  online,
  rating,
  total_consultations
) values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid, -- Replace with actual auth.users.id
  'Dr. Sarah Mitchell',
  'dr.sarah.mitchell@healthportal.demo',
  '+1-555-0101',
  array['Cardiology', 'Internal Medicine'],
  'MD-CA-123456',
  true,
  'Board-certified cardiologist with 15 years of experience in preventive cardiology and heart disease management.',
  array['MD - Harvard Medical School', 'Cardiology Fellowship - Johns Hopkins', 'Board Certified - Internal Medicine'],
  15,
  150.00,
  '{
    "monday": [{"start": "09:00", "end": "17:00"}],
    "tuesday": [{"start": "09:00", "end": "17:00"}],
    "wednesday": [{"start": "09:00", "end": "17:00"}],
    "thursday": [{"start": "09:00", "end": "17:00"}],
    "friday": [{"start": "09:00", "end": "15:00"}]
  }'::jsonb,
  true,
  4.8,
  342
) on conflict (id) do nothing;

-- Demo Patient (replace user_id with actual auth.users UUID after signup)
insert into public.patients (
  id,
  user_id,
  full_name,
  email,
  phone,
  date_of_birth,
  gender,
  blood_group,
  allergies,
  chronic_conditions,
  emergency_contact,
  address
) values (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '20000000-0000-0000-0000-000000000002'::uuid, -- Replace with actual auth.users.id
  'John Anderson',
  'john.anderson@patient.demo',
  '+1-555-0202',
  '1985-06-15'::date,
  'male',
  'O+',
  array['Penicillin', 'Shellfish'],
  array['Hypertension'],
  '{
    "name": "Jane Anderson",
    "relationship": "Spouse",
    "phone": "+1-555-0203"
  }'::jsonb,
  '{
    "street": "123 Main Street",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102"
  }'::jsonb
) on conflict (id) do nothing;

-- Demo Appointment (scheduled for today at 2 PM)
insert into public.appointments (
  id,
  patient_id,
  doctor_id,
  scheduled_at,
  duration_minutes,
  status,
  appointment_type,
  meet_link,
  patient_notes,
  fee_amount,
  payment_status
) values (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  (current_date + interval '14 hours')::timestamptz, -- Today at 2 PM
  30,
  'confirmed',
  'follow_up',
  'https://meet.google.com/abc-defg-hij',
  'Recent blood work review - cholesterol and BP follow-up',
  150.00,
  'paid'
) on conflict (id) do nothing;

-- Demo Consent (patient shares reports with doctor)
insert into public.consents (
  id,
  patient_id,
  doctor_id,
  granted,
  consent_type,
  scope,
  granted_at
) values (
  '00000000-0000-0000-0000-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  true,
  'report_access',
  array['view_reports', 'view_medical_history', 'ai_analysis'],
  now()
) on conflict (id) do nothing;

-- =====================================================================
-- COMMENTS
-- =====================================================================
comment on table public.doctors is 'Verified healthcare providers';
comment on table public.patients is 'Patient medical records and profiles';
comment on table public.appointments is 'Scheduled and completed consultations';
comment on table public.reports is 'Medical reports, lab results, imaging, etc.';
comment on table public.consents is 'Patient consent records for data sharing';
comment on table public.messages is 'Secure messaging between doctors and patients';
comment on table public.audit_log is 'Comprehensive audit trail for compliance';
