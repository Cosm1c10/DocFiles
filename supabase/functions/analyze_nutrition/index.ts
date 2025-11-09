// =====================================================================
// Edge Function: Nutrition Analysis
// Description: Analyzes food items and returns nutritional information
// Integration: USDA FoodData Central API + local cache
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
// TYPES & INTERFACES
// =====================================================================

interface NutritionRequest {
  food_name: string;
  quantity?: number; // default 1
  unit?: string; // g, oz, cup, piece, etc.
}

interface NutritionData {
  food_name: string;
  brand?: string;
  serving_size: string;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  cholesterol_mg?: number;
  source: string;
  external_id?: string;
}

interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

// =====================================================================
// CONSTANTS
// =====================================================================

// Note: USDA FoodData Central API is free but requires API key
// Get yours at: https://fdc.nal.usda.gov/api-key-signup.html
const USDA_API_KEY = Deno.env.get("USDA_API_KEY") || "DEMO_KEY";
const USDA_API_URL = "https://api.nal.usda.gov/fdc/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Nutrient ID mapping for USDA FoodData Central
const NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003, // g
  CARBS: 1005, // g (by difference)
  FATS: 1004, // g (total lipid)
  FIBER: 1079, // g
  SUGAR: 2000, // g
  SODIUM: 1093, // mg
  CHOLESTEROL: 1253, // mg
};

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function normalizeUnit(unit: string): string {
  const unitMap: { [key: string]: string } = {
    "g": "g",
    "gram": "g",
    "grams": "g",
    "oz": "oz",
    "ounce": "oz",
    "ounces": "oz",
    "cup": "cup",
    "cups": "cup",
    "tbsp": "tbsp",
    "tablespoon": "tbsp",
    "tsp": "tsp",
    "teaspoon": "tsp",
    "piece": "piece",
    "pieces": "piece",
    "serving": "serving",
  };
  return unitMap[unit.toLowerCase()] || unit;
}

function getNutrientValue(nutrients: any[], nutrientId: number): number {
  const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
  return nutrient ? nutrient.value : 0;
}

async function searchUSDAFood(foodName: string): Promise<NutritionData | null> {
  try {
    const searchUrl = `${USDA_API_URL}/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`;

    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.error(`[USDA API Error] Status: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      return null;
    }

    const food: USDAFoodItem = data.foods[0];

    // Extract nutritional data
    const nutritionData: NutritionData = {
      food_name: food.description,
      brand: food.brandName,
      serving_size: (food.servingSize || 100).toString(),
      serving_unit: normalizeUnit(food.servingSizeUnit || "g"),
      calories: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.ENERGY),
      protein_g: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.PROTEIN),
      carbs_g: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.CARBS),
      fats_g: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.FATS),
      fiber_g: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.FIBER),
      sugar_g: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.SUGAR),
      sodium_mg: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.SODIUM),
      cholesterol_mg: getNutrientValue(food.foodNutrients, NUTRIENT_IDS.CHOLESTEROL),
      source: "usda",
      external_id: food.fdcId.toString(),
    };

    return nutritionData;
  } catch (error) {
    console.error(`[USDA Search Error] ${error}`);
    return null;
  }
}

async function getCachedNutrition(
  supabaseClient: any,
  foodName: string
): Promise<NutritionData | null> {
  const { data, error } = await supabaseClient
    .from("food_database")
    .select("*")
    .ilike("food_name", foodName)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    food_name: data.food_name,
    brand: data.brand,
    serving_size: data.serving_size,
    serving_unit: data.serving_unit,
    calories: parseFloat(data.calories),
    protein_g: parseFloat(data.protein_g),
    carbs_g: parseFloat(data.carbs_g),
    fats_g: parseFloat(data.fats_g),
    fiber_g: data.fiber_g ? parseFloat(data.fiber_g) : undefined,
    sugar_g: data.sugar_g ? parseFloat(data.sugar_g) : undefined,
    sodium_mg: data.sodium_mg ? parseFloat(data.sodium_mg) : undefined,
    cholesterol_mg: data.cholesterol_mg ? parseFloat(data.cholesterol_mg) : undefined,
    source: data.source,
    external_id: data.external_id,
  };
}

async function cacheNutrition(
  supabaseClient: any,
  nutritionData: NutritionData
): Promise<void> {
  await supabaseClient.from("food_database").insert({
    food_name: nutritionData.food_name,
    brand: nutritionData.brand,
    serving_size: nutritionData.serving_size,
    serving_unit: nutritionData.serving_unit,
    calories: nutritionData.calories,
    protein_g: nutritionData.protein_g,
    carbs_g: nutritionData.carbs_g,
    fats_g: nutritionData.fats_g,
    fiber_g: nutritionData.fiber_g,
    sugar_g: nutritionData.sugar_g,
    sodium_mg: nutritionData.sodium_mg,
    cholesterol_mg: nutritionData.cholesterol_mg,
    source: nutritionData.source,
    external_id: nutritionData.external_id,
    verified: false,
  });
}

function scaleNutrition(
  nutritionData: NutritionData,
  quantity: number,
  targetUnit: string
): NutritionData {
  // For simplicity, assume quantity is in same units
  // In production, implement proper unit conversions
  const scale = quantity;

  return {
    ...nutritionData,
    serving_size: (parseFloat(nutritionData.serving_size) * quantity).toString(),
    calories: nutritionData.calories * scale,
    protein_g: nutritionData.protein_g * scale,
    carbs_g: nutritionData.carbs_g * scale,
    fats_g: nutritionData.fats_g * scale,
    fiber_g: nutritionData.fiber_g ? nutritionData.fiber_g * scale : undefined,
    sugar_g: nutritionData.sugar_g ? nutritionData.sugar_g * scale : undefined,
    sodium_mg: nutritionData.sodium_mg ? nutritionData.sodium_mg * scale : undefined,
    cholesterol_mg: nutritionData.cholesterol_mg ? nutritionData.cholesterol_mg * scale : undefined,
  };
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // =====================================================================
    // AUTHENTICATE USER
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

    // =====================================================================
    // PARSE REQUEST
    // =====================================================================
    const requestBody: NutritionRequest = await req.json();
    const { food_name, quantity, unit } = requestBody;

    if (!food_name || food_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST", message: "food_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qty = quantity || 1;
    const targetUnit = unit ? normalizeUnit(unit) : "serving";

    // =====================================================================
    // CHECK CACHE FIRST
    // =====================================================================
    let nutritionData = await getCachedNutrition(supabaseClient, food_name);

    if (nutritionData) {
      console.log(`[Cache Hit] Found ${food_name} in database`);
    } else {
      // =====================================================================
      // SEARCH USDA API
      // =====================================================================
      console.log(`[Cache Miss] Searching USDA for ${food_name}`);
      nutritionData = await searchUSDAFood(food_name);

      if (nutritionData) {
        // Cache the result
        try {
          await cacheNutrition(supabaseClient, nutritionData);
          console.log(`[Cached] Saved ${food_name} to database`);
        } catch (cacheError) {
          console.error(`[Cache Error] ${cacheError}`);
          // Continue even if caching fails
        }
      } else {
        // =====================================================================
        // FOOD NOT FOUND - RETURN MANUAL ENTRY PROMPT
        // =====================================================================
        return new Response(
          JSON.stringify({
            ok: false,
            found: false,
            message: "Food not found in database. Please enter nutrition info manually.",
            suggestion: {
              food_name: food_name,
              serving_size: "100",
              serving_unit: "g",
              calories: 0,
              protein_g: 0,
              carbs_g: 0,
              fats_g: 0,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // =====================================================================
    // SCALE NUTRITION DATA
    // =====================================================================
    const scaledNutrition = scaleNutrition(nutritionData, qty, targetUnit);

    // =====================================================================
    // RETURN NUTRITION DATA
    // =====================================================================
    return new Response(
      JSON.stringify({
        ok: true,
        found: true,
        nutrition: scaledNutrition,
        query: {
          food_name: food_name,
          quantity: qty,
          unit: targetUnit,
        },
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
