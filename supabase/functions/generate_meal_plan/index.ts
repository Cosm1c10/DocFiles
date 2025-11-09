// =====================================================================
// Edge Function: AI Meal Plan Generator
// Description: Creates personalized meal plans based on health data
// Security: Patient-only access, considers medical reports and allergies
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
// TYPES & INTERFACES
// =====================================================================

interface MealPlanRequest {
  duration_days: number; // 7, 14, or 30
  health_goals: string[]; // weight_loss, muscle_gain, diabetes_control, heart_health, etc.
  dietary_restrictions?: string[]; // vegetarian, vegan, gluten_free, dairy_free, etc.
  calorie_target?: number; // Optional override
}

interface Meal {
  name: string;
  ingredients: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  instructions: string;
}

interface DayMeals {
  day: number;
  date?: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snack1: Meal;
    snack2: Meal;
  };
}

interface MealPlanResponse {
  daily_calorie_target: number;
  rationale: string;
  shopping_list: string[];
  days: DayMeals[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message: string;
  };
}

// =====================================================================
// CONSTANTS
// =====================================================================

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function calculateDailyCalories(
  patient: any,
  healthMetrics: any,
  goals: string[]
): number {
  // Harris-Benedict Equation for BMR
  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : 30;

  const weight = healthMetrics?.weight_kg || 70; // Default 70kg if not available
  const height = healthMetrics?.height_cm || 170; // Default 170cm

  let bmr: number;
  if (patient.gender === "male") {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity multiplier (assume moderate activity)
  let tdee = bmr * 1.55;

  // Adjust for goals
  if (goals.includes("weight_loss")) {
    tdee -= 500; // 500 calorie deficit for ~1lb/week loss
  } else if (goals.includes("muscle_gain")) {
    tdee += 300; // 300 calorie surplus
  }

  // Round to nearest 100
  return Math.round(tdee / 100) * 100;
}

function buildMealPlanPrompt(
  patient: any,
  healthMetrics: any,
  recentReports: any[],
  request: MealPlanRequest,
  calculatedCalories: number
): string {
  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : "unknown";

  const calorieTarget = request.calorie_target || calculatedCalories;

  // Extract health concerns from reports
  const healthConcerns: string[] = [];
  recentReports.forEach(report => {
    if (report.ai_summary?.flags) {
      report.ai_summary.flags.forEach((flag: any) => {
        if (flag.label.toLowerCase().includes("cholesterol")) {
          healthConcerns.push("High cholesterol");
        }
        if (flag.label.toLowerCase().includes("glucose") || flag.label.toLowerCase().includes("blood sugar")) {
          healthConcerns.push("Elevated blood sugar / Diabetes");
        }
        if (flag.label.toLowerCase().includes("blood pressure")) {
          healthConcerns.push("Hypertension");
        }
      });
    }
  });

  const uniqueConcerns = [...new Set(healthConcerns)];

  const prompt = `You are a professional registered dietitian creating a personalized ${request.duration_days}-day meal plan. You MUST return ONLY valid JSON, no markdown formatting.

**Patient Profile:**
- Age: ${age} years
- Gender: ${patient.gender || "Not specified"}
- Weight: ${healthMetrics?.weight_kg || "unknown"} kg
- Height: ${healthMetrics?.height_cm || "unknown"} cm
- BMI: ${healthMetrics?.bmi || "unknown"}
- Chronic Conditions: ${patient.chronic_conditions?.join(", ") || "None"}
- Allergies: ${patient.allergies?.join(", ") || "None"}

**Health Concerns from Recent Labs:**
${uniqueConcerns.length > 0 ? uniqueConcerns.join(", ") : "None identified"}

**Health Goals:**
${request.health_goals.join(", ")}

**Dietary Requirements:**
- Daily Calorie Target: ${calorieTarget} kcal
- Dietary Restrictions: ${request.dietary_restrictions?.join(", ") || "None"}
- Foods to Avoid: ${patient.allergies?.join(", ") || "None"}

**Nutritional Guidelines Based on Health Profile:**
${request.health_goals.includes("diabetes_control") || uniqueConcerns.includes("Elevated blood sugar / Diabetes")
  ? "- Low glycemic index foods, complex carbs, high fiber (30-40g/day)\n- Limit simple sugars\n- Consistent carb distribution across meals"
  : ""}
${request.health_goals.includes("heart_health") || uniqueConcerns.includes("High cholesterol") || uniqueConcerns.includes("Hypertension")
  ? "- Heart-healthy fats (omega-3, nuts, avocado)\n- Limit saturated fats (<7% of calories)\n- High fiber (25-30g/day)\n- Limit sodium (<2300mg/day)"
  : ""}
${request.health_goals.includes("weight_loss")
  ? "- High protein (25-30% of calories) for satiety\n- High fiber foods\n- Portion control\n- Nutrient-dense, low-calorie foods"
  : ""}

**Instructions:**
Generate a ${request.duration_days}-day meal plan with:
- 3 main meals (breakfast, lunch, dinner) + 2 snacks per day
- Balanced macronutrients appropriate for health goals
- Variety of foods (no repetition in first 3 days)
- Simple, practical recipes with common ingredients
- Clear, easy-to-follow instructions (2-4 steps max)
- Accurate calorie and macro calculations

**Required Output Format (MUST be valid JSON, no markdown code blocks):**
{
  "daily_calorie_target": ${calorieTarget},
  "rationale": "2-3 sentence explanation of why this plan suits the patient's health profile and goals",
  "shopping_list": ["ingredient 1", "ingredient 2", "ingredient 3", ...],
  "days": [
    {
      "day": 1,
      "meals": {
        "breakfast": {
          "name": "Meal name",
          "ingredients": ["1 cup oats", "1/2 cup blueberries", "1 tbsp honey", "1 cup almond milk"],
          "calories": 350,
          "protein_g": 10,
          "carbs_g": 65,
          "fats_g": 7,
          "fiber_g": 8,
          "instructions": "1. Cook oats with almond milk. 2. Top with berries and honey. 3. Serve warm."
        },
        "lunch": {
          "name": "Meal name",
          "ingredients": [...],
          "calories": 450,
          "protein_g": 30,
          "carbs_g": 45,
          "fats_g": 15,
          "fiber_g": 10,
          "instructions": "..."
        },
        "dinner": {
          "name": "Meal name",
          "ingredients": [...],
          "calories": 550,
          "protein_g": 40,
          "carbs_g": 50,
          "fats_g": 20,
          "fiber_g": 12,
          "instructions": "..."
        },
        "snack1": {
          "name": "Snack name",
          "ingredients": [...],
          "calories": 150,
          "protein_g": 8,
          "carbs_g": 15,
          "fats_g": 6,
          "fiber_g": 3,
          "instructions": "..."
        },
        "snack2": {
          "name": "Snack name",
          "ingredients": [...],
          "calories": 100,
          "protein_g": 5,
          "carbs_g": 12,
          "fats_g": 3,
          "fiber_g": 2,
          "instructions": "..."
        }
      }
    }
    ${request.duration_days > 1 ? ', ... (continue for all ' + request.duration_days + ' days)' : ''}
  ]
}

Return ONLY the JSON object, no additional text or markdown formatting.`;

  return prompt;
}

async function callGeminiMealPlan(prompt: string): Promise<MealPlanResponse> {
  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3, // Lower for more consistent meal plans
      maxOutputTokens: 8000, // Large for full meal plans
      topP: 0.95,
      topK: 40,
    },
  };

  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Gemini API Error] Status: ${response.status}, Body: ${errorText}`);
    throw new Error(`Gemini API request failed: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Gemini response missing text content");
  }

  // Parse JSON from response
  let mealPlan: any;
  try {
    // Gemini sometimes wraps JSON in ```json ... ``` markdown
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;
    mealPlan = JSON.parse(jsonText.trim());
  } catch (parseError) {
    console.error(`[JSON Parse Error] Raw text: ${rawText.substring(0, 500)}...`);
    throw new Error(`Failed to parse Gemini JSON response`);
  }

  return mealPlan as MealPlanResponse;
}

// =====================================================================
// MAIN HANDLER
// =====================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // =====================================================================
    // 1. VALIDATE ENVIRONMENT
    // =====================================================================
    if (!GEMINI_API_KEY) {
      console.error("[Config Error] GEMINI_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // =====================================================================
    // 2. AUTHENTICATE PATIENT
    // =====================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // =====================================================================
    // 3. GET PATIENT DATA
    // =====================================================================
    const { data: patient, error: patientError } = await supabaseClient
      .from("patients")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: "NOT_PATIENT", message: "Only patients can generate meal plans" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 4. PARSE REQUEST
    // =====================================================================
    const requestBody: MealPlanRequest = await req.json();
    const { duration_days, health_goals, dietary_restrictions, calorie_target } = requestBody;

    // Validate duration
    if (![7, 14, 30].includes(duration_days)) {
      return new Response(
        JSON.stringify({ error: "INVALID_DURATION", message: "Duration must be 7, 14, or 30 days" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!health_goals || health_goals.length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_GOALS", message: "At least one health goal is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 5. FETCH HEALTH METRICS
    // =====================================================================
    const { data: healthMetrics } = await supabaseClient
      .from("health_metrics")
      .select("*")
      .eq("patient_id", patient.id)
      .order("metric_date", { ascending: false })
      .limit(1)
      .single();

    // =====================================================================
    // 6. FETCH RECENT REPORTS FOR CONTEXT
    // =====================================================================
    const { data: recentReports } = await supabaseClient
      .from("reports")
      .select("id, title, report_date, ai_summary, ai_tags")
      .eq("patient_id", patient.id)
      .not("ai_summary", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);

    // =====================================================================
    // 7. CALCULATE CALORIE TARGET
    // =====================================================================
    const calculatedCalories = calculateDailyCalories(
      patient,
      healthMetrics,
      health_goals
    );

    // =====================================================================
    // 8. BUILD PROMPT & CALL GEMINI
    // =====================================================================
    const prompt = buildMealPlanPrompt(
      patient,
      healthMetrics,
      recentReports || [],
      requestBody,
      calculatedCalories
    );

    let mealPlan: MealPlanResponse;
    try {
      mealPlan = await callGeminiMealPlan(prompt);
    } catch (aiError) {
      console.error(`[Gemini Error] ${aiError}`);
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "Failed to generate meal plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 9. STORE MEAL PLAN IN DATABASE
    // =====================================================================
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration_days - 1);

    const reportIds = recentReports?.map(r => r.id) || [];

    const { data: savedPlan, error: saveError } = await supabaseClient
      .from("meal_plans")
      .insert({
        patient_id: patient.id,
        plan_name: `${health_goals.join(", ")} - ${duration_days} days`,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        daily_calorie_target: mealPlan.daily_calorie_target,
        dietary_restrictions: dietary_restrictions || [],
        health_goals: health_goals,
        meals: mealPlan,
        generated_by_ai: true,
        ai_rationale: mealPlan.rationale,
        based_on_reports: reportIds,
        status: "active",
      })
      .select()
      .single();

    if (saveError) {
      console.error(`[Save Error] ${saveError.message}`);
      return new Response(
        JSON.stringify({ error: "SAVE_ERROR", message: "Failed to save meal plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 10. AUDIT LOG
    // =====================================================================
    await supabaseClient.from("audit_log").insert({
      actor: userId,
      action: "meal_plan_generated",
      entity: "meal_plans",
      entity_id: savedPlan.id,
      meta: {
        duration_days: duration_days,
        health_goals: health_goals,
        calorie_target: mealPlan.daily_calorie_target,
        reports_used: reportIds.length,
      },
    });

    // =====================================================================
    // 11. RETURN SUCCESS
    // =====================================================================
    return new Response(
      JSON.stringify({
        ok: true,
        meal_plan: mealPlan,
        plan_id: savedPlan.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[Unhandled Error] ${error}`);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
