// =====================================================================
// Patient Types
// Description: TypeScript interfaces for patient-related data
// =====================================================================

export interface Patient {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_group?: string;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthMetric {
  id: string;
  patient_id: string;
  metric_date: string;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate_bpm?: number;
  blood_glucose_mg?: number;
  temperature_celsius?: number;
  spo2_percent?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MealLog {
  id: string;
  patient_id: string;
  meal_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fats_g: number;
  image_path?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealPlan {
  id: string;
  patient_id: string;
  plan_name: string;
  start_date: string;
  end_date: string;
  daily_calorie_target: number;
  dietary_restrictions: string[];
  health_goals: string[];
  meals: any;
  generated_by_ai: boolean;
  ai_rationale?: string;
  based_on_reports: string[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface DailyGoals {
  id: string;
  patient_id: string;
  goal_date: string;
  calorie_goal?: number;
  protein_goal_g?: number;
  water_intake_goal_ml?: number;
  exercise_minutes_goal?: number;
  calories_consumed: number;
  protein_consumed_g: number;
  water_intake_ml: number;
  exercise_minutes: number;
  weight_recorded: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'routine_checkup';
  meet_link?: string;
  patient_notes?: string;
  doctor_notes?: string;
  fee_amount?: number;
  payment_status?: 'pending' | 'paid' | 'refunded' | 'failed';
  doctor?: {
    full_name: string;
    specialties: string[];
    avatar_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  file_path: string;
  file_mime: string;
  file_size_bytes?: number;
  ai_summary?: {
    summary: string;
    priority: 'normal' | 'urgent' | 'critical';
    flags: any[];
    questions: string[];
    recommended_tests: string[];
  };
  ai_tags: string[];
  report_date?: string;
  report_type: 'lab_report' | 'imaging' | 'prescription' | 'medical_history' | 'vaccination' | 'other';
  created_at: string;
  updated_at: string;
}
