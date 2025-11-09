-- =====================================================================
-- Patient Features Schema Migration
-- Version: 003
-- Description: Tables for patient portal features (health metrics, meals, AI)
-- =====================================================================

-- =====================================================================
-- HEALTH_METRICS TABLE
-- =====================================================================
create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  metric_date date not null,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(4,2),
  systolic_bp integer,
  diastolic_bp integer,
  heart_rate_bpm integer,
  blood_glucose_mg numeric(5,1),
  temperature_celsius numeric(3,1),
  spo2_percent integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_health_metrics_patient on public.health_metrics(patient_id, metric_date desc);
create index idx_health_metrics_date on public.health_metrics(metric_date desc);

-- Trigger for auto-calculating BMI
create or replace function calculate_bmi()
returns trigger as $$
begin
  if new.weight_kg is not null and new.height_cm is not null and new.height_cm > 0 then
    new.bmi := round((new.weight_kg / ((new.height_cm / 100.0) ^ 2))::numeric, 2);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger health_metrics_calculate_bmi
  before insert or update on public.health_metrics
  for each row
  execute function calculate_bmi();

create trigger health_metrics_updated_at
  before update on public.health_metrics
  for each row
  execute function update_updated_at();

-- =====================================================================
-- MEAL_LOGS TABLE
-- =====================================================================
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  meal_date date not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_items jsonb not null default '[]'::jsonb,
  total_calories numeric(6,1) default 0,
  total_protein_g numeric(5,1) default 0,
  total_carbs_g numeric(5,1) default 0,
  total_fats_g numeric(5,1) default 0,
  image_path text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_meal_logs_patient_date on public.meal_logs(patient_id, meal_date desc);
create index idx_meal_logs_date on public.meal_logs(meal_date desc);
create index idx_meal_logs_type on public.meal_logs(meal_type);

create trigger meal_logs_updated_at
  before update on public.meal_logs
  for each row
  execute function update_updated_at();

-- =====================================================================
-- MEAL_PLANS TABLE
-- =====================================================================
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  plan_name text not null,
  start_date date not null,
  end_date date not null,
  daily_calorie_target integer not null,
  dietary_restrictions text[] default '{}',
  health_goals text[] default '{}',
  meals jsonb not null default '{}'::jsonb,
  generated_by_ai boolean default true,
  ai_rationale text,
  based_on_reports uuid[] default '{}',
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_meal_plans_patient on public.meal_plans(patient_id, start_date desc);
create index idx_meal_plans_active on public.meal_plans(patient_id, status)
  where status = 'active';
create index idx_meal_plans_dates on public.meal_plans(start_date, end_date);

create trigger meal_plans_updated_at
  before update on public.meal_plans
  for each row
  execute function update_updated_at();

-- =====================================================================
-- AI_CONSULTATIONS TABLE
-- =====================================================================
create table if not exists public.ai_consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  session_id uuid not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context_reports uuid[] default '{}',
  created_at timestamptz default now()
);

create index idx_ai_consultations_patient_session on public.ai_consultations(patient_id, session_id, created_at asc);
create index idx_ai_consultations_session on public.ai_consultations(session_id, created_at asc);

-- =====================================================================
-- DAILY_GOALS TABLE
-- =====================================================================
create table if not exists public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  goal_date date not null default current_date,
  calorie_goal integer,
  protein_goal_g numeric(5,1),
  water_intake_goal_ml integer default 2000,
  exercise_minutes_goal integer default 30,
  calories_consumed integer default 0,
  protein_consumed_g numeric(5,1) default 0,
  water_intake_ml integer default 0,
  exercise_minutes integer default 0,
  weight_recorded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint daily_goals_unique_patient_date unique (patient_id, goal_date)
);

create index idx_daily_goals_patient_date on public.daily_goals(patient_id, goal_date desc);
create index idx_daily_goals_date on public.daily_goals(goal_date desc);

create trigger daily_goals_updated_at
  before update on public.daily_goals
  for each row
  execute function update_updated_at();

-- =====================================================================
-- FOOD_DATABASE TABLE (for caching nutrition data)
-- =====================================================================
create table if not exists public.food_database (
  id uuid primary key default gen_random_uuid(),
  food_name text not null,
  food_name_lower text generated always as (lower(food_name)) stored,
  brand text,
  serving_size text,
  serving_unit text,
  calories numeric(6,1) not null,
  protein_g numeric(5,1),
  carbs_g numeric(5,1),
  fats_g numeric(5,1),
  fiber_g numeric(5,1),
  sugar_g numeric(5,1),
  sodium_mg numeric(6,1),
  cholesterol_mg numeric(5,1),
  vitamins jsonb default '{}'::jsonb,
  minerals jsonb default '{}'::jsonb,
  source text default 'manual',
  external_id text,
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_food_database_name on public.food_database using gin(food_name_lower gin_trgm_ops);
create index idx_food_database_source on public.food_database(source);
create index idx_food_database_verified on public.food_database(verified) where verified = true;

create trigger food_database_updated_at
  before update on public.food_database
  for each row
  execute function update_updated_at();

-- =====================================================================
-- PATIENT_PREFERENCES TABLE
-- =====================================================================
create table if not exists public.patient_preferences (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  daily_calorie_target integer default 2000,
  weight_goal_kg numeric(5,2),
  weight_goal_deadline date,
  health_objectives text[] default '{}',
  dietary_preferences text[] default '{}',
  notification_preferences jsonb default '{
    "email": true,
    "appointments": true,
    "reports": true,
    "meal_reminders": true,
    "ai_insights": true
  }'::jsonb,
  ui_preferences jsonb default '{
    "theme": "light",
    "sidebar_collapsed": false,
    "language": "en"
  }'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger patient_preferences_updated_at
  before update on public.patient_preferences
  for each row
  execute function update_updated_at();

-- =====================================================================
-- COMMENTS
-- =====================================================================
comment on table public.health_metrics is 'Daily health tracking data (weight, BP, glucose, etc.)';
comment on table public.meal_logs is 'Patient food intake logging with nutritional data';
comment on table public.meal_plans is 'AI-generated personalized meal plans based on health data';
comment on table public.ai_consultations is 'Conversation history with AI health consultant';
comment on table public.daily_goals is 'Daily health goals and progress tracking';
comment on table public.food_database is 'Cached food nutrition database for quick lookups';
comment on table public.patient_preferences is 'Patient settings and preferences';
