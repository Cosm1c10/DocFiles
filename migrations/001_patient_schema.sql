-- =====================================================================
-- Patient Portal Schema Migration
-- Version: 001
-- Description: Core tables for patient portal
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
-- REPORTS TABLE
-- =====================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
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
create index idx_reports_ai_tags on public.reports using gin(ai_tags);
create index idx_reports_created on public.reports(created_at desc);
create index idx_reports_type on public.reports(report_type);

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

create trigger reports_updated_at before update on public.reports
  for each row execute function update_updated_at();

-- =====================================================================
-- COMMENTS
-- =====================================================================
comment on table public.patients is 'Patient medical records and profiles';
comment on table public.reports is 'Medical reports, lab results, imaging, etc.';
comment on table public.audit_log is 'Comprehensive audit trail for compliance';
