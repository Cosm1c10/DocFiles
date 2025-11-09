-- =====================================================================
-- Patient Features RLS Policies
-- Version: 004
-- Description: Row Level Security policies for patient portal tables
-- =====================================================================

-- Enable RLS on all patient feature tables
alter table public.health_metrics enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_plans enable row level security;
alter table public.ai_consultations enable row level security;
alter table public.daily_goals enable row level security;
alter table public.food_database enable row level security;
alter table public.patient_preferences enable row level security;

-- =====================================================================
-- HEALTH_METRICS POLICIES
-- =====================================================================

-- Patients can view their own health metrics
create policy "Patients can view own health metrics"
  on public.health_metrics for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can insert their own health metrics
create policy "Patients can insert own health metrics"
  on public.health_metrics for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can update their own health metrics
create policy "Patients can update own health metrics"
  on public.health_metrics for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can delete their own health metrics
create policy "Patients can delete own health metrics"
  on public.health_metrics for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Doctors can view health metrics of patients with active consent
create policy "Doctors can view consented patient health metrics"
  on public.health_metrics for select
  using (
    patient_id in (
      select c.patient_id
      from public.consents c
      join public.doctors d on d.id = c.doctor_id
      where d.user_id = auth.uid()
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and 'view_medical_history' = any(c.scope)
    )
  );

-- =====================================================================
-- MEAL_LOGS POLICIES
-- =====================================================================

-- Patients can manage their own meal logs
create policy "Patients can view own meal logs"
  on public.meal_logs for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can insert own meal logs"
  on public.meal_logs for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can update own meal logs"
  on public.meal_logs for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can delete own meal logs"
  on public.meal_logs for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Doctors can view meal logs with consent
create policy "Doctors can view consented patient meal logs"
  on public.meal_logs for select
  using (
    patient_id in (
      select c.patient_id
      from public.consents c
      join public.doctors d on d.id = c.doctor_id
      where d.user_id = auth.uid()
        and c.granted = true
        and (c.expires_at is null or c.expires_at > now())
        and 'view_medical_history' = any(c.scope)
    )
  );

-- =====================================================================
-- MEAL_PLANS POLICIES
-- =====================================================================

-- Patients can manage their own meal plans
create policy "Patients can view own meal plans"
  on public.meal_plans for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can insert own meal plans"
  on public.meal_plans for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can update own meal plans"
  on public.meal_plans for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can delete own meal plans"
  on public.meal_plans for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- =====================================================================
-- AI_CONSULTATIONS POLICIES
-- =====================================================================

-- Patients can view their own AI consultation history
create policy "Patients can view own AI consultations"
  on public.ai_consultations for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can insert their own AI consultations
create policy "Patients can insert own AI consultations"
  on public.ai_consultations for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Only patients can delete their own AI consultation history
create policy "Patients can delete own AI consultations"
  on public.ai_consultations for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- =====================================================================
-- DAILY_GOALS POLICIES
-- =====================================================================

-- Patients can manage their own daily goals
create policy "Patients can view own daily goals"
  on public.daily_goals for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can insert own daily goals"
  on public.daily_goals for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can update own daily goals"
  on public.daily_goals for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

create policy "Patients can delete own daily goals"
  on public.daily_goals for delete
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- =====================================================================
-- FOOD_DATABASE POLICIES
-- =====================================================================

-- Anyone authenticated can view food database (it's reference data)
create policy "Authenticated users can view food database"
  on public.food_database for select
  using (auth.role() = 'authenticated');

-- Only service role can insert/update food database
create policy "Service role can manage food database"
  on public.food_database for all
  using (auth.role() = 'service_role');

-- =====================================================================
-- PATIENT_PREFERENCES POLICIES
-- =====================================================================

-- Patients can view their own preferences
create policy "Patients can view own preferences"
  on public.patient_preferences for select
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can insert their own preferences
create policy "Patients can insert own preferences"
  on public.patient_preferences for insert
  with check (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- Patients can update their own preferences
create policy "Patients can update own preferences"
  on public.patient_preferences for update
  using (
    patient_id in (
      select id from public.patients where user_id = auth.uid()
    )
  );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to get or create daily goals for a patient
create or replace function get_or_create_daily_goals(p_patient_id uuid, p_goal_date date default current_date)
returns public.daily_goals as $$
declare
  v_goals public.daily_goals;
  v_preferences public.patient_preferences;
begin
  -- Try to get existing goals
  select * into v_goals
  from public.daily_goals
  where patient_id = p_patient_id and goal_date = p_goal_date;

  -- If not found, create new goals based on preferences
  if not found then
    -- Get patient preferences
    select * into v_preferences
    from public.patient_preferences
    where patient_id = p_patient_id;

    -- Create new goals
    insert into public.daily_goals (
      patient_id,
      goal_date,
      calorie_goal,
      protein_goal_g,
      water_intake_goal_ml,
      exercise_minutes_goal
    ) values (
      p_patient_id,
      p_goal_date,
      coalesce(v_preferences.daily_calorie_target, 2000),
      50.0, -- Default protein goal
      2000, -- Default water intake
      30    -- Default exercise minutes
    )
    returning * into v_goals;
  end if;

  return v_goals;
end;
$$ language plpgsql security definer;

-- Function to update daily goals from meal logs (triggers)
create or replace function update_daily_goals_from_meal()
returns trigger as $$
begin
  -- Update or insert daily goals for this meal
  insert into public.daily_goals (
    patient_id,
    goal_date,
    calories_consumed,
    protein_consumed_g
  )
  values (
    new.patient_id,
    new.meal_date,
    new.total_calories,
    new.total_protein_g
  )
  on conflict (patient_id, goal_date)
  do update set
    calories_consumed = daily_goals.calories_consumed + new.total_calories,
    protein_consumed_g = daily_goals.protein_consumed_g + new.total_protein_g,
    updated_at = now();

  return new;
end;
$$ language plpgsql;

create trigger meal_logs_update_daily_goals
  after insert on public.meal_logs
  for each row
  execute function update_daily_goals_from_meal();

-- Function to mark weight recorded when health metric added
create or replace function mark_weight_recorded()
returns trigger as $$
begin
  if new.weight_kg is not null then
    insert into public.daily_goals (
      patient_id,
      goal_date,
      weight_recorded
    )
    values (
      new.patient_id,
      new.metric_date,
      true
    )
    on conflict (patient_id, goal_date)
    do update set
      weight_recorded = true,
      updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql;

create trigger health_metrics_mark_weight
  after insert on public.health_metrics
  for each row
  execute function mark_weight_recorded();

-- =====================================================================
-- AUDIT LOGGING TRIGGERS
-- =====================================================================

-- Function to log patient actions
create or replace function log_patient_action()
returns trigger as $$
declare
  v_action text;
  v_entity text;
begin
  -- Determine action
  case TG_OP
    when 'INSERT' then v_action := 'create';
    when 'UPDATE' then v_action := 'update';
    when 'DELETE' then v_action := 'delete';
  end case;

  -- Get entity name from table
  v_entity := TG_TABLE_NAME;

  -- Insert audit log
  insert into public.audit_log (
    actor,
    action,
    entity,
    entity_id,
    meta
  ) values (
    auth.uid(),
    v_action,
    v_entity,
    coalesce(new.id::text, old.id::text),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    )
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer;

-- Add audit triggers
create trigger health_metrics_audit after insert or update or delete on public.health_metrics
  for each row execute function log_patient_action();

create trigger meal_logs_audit after insert or update or delete on public.meal_logs
  for each row execute function log_patient_action();

create trigger meal_plans_audit after insert or update or delete on public.meal_plans
  for each row execute function log_patient_action();
