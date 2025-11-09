// =====================================================================
// Edge Function: Report Analysis with Google Gemini AI
// Description: Processes medical reports using Gemini for clinical insights
// Security: Validates auth, enforces consent, comprehensive audit logging
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
// TYPES & INTERFACES
// =====================================================================

interface AISummaryRequest {
  report_id: string;
  force_reprocess?: boolean;
}

interface AIFlag {
  label: string;
  value: string;
  reason: string;
  source_snippet: string;
}

interface AISummary {
  summary: string;
  priority: "normal" | "urgent" | "critical";
  flags: AIFlag[];
  questions: string[];
  recommended_tests: string[];
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

const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  REPORT_NOT_FOUND: "REPORT_NOT_FOUND",
  NO_CONSENT: "NO_CONSENT",
  AI_VALIDATION_FAILED: "AI_VALIDATION_FAILED",
  AI_REQUEST_FAILED: "AI_REQUEST_FAILED",
  OCR_FAILED: "OCR_FAILED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

// =====================================================================
// CORS HEADERS
// =====================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function extractTextFromFile(signedUrl: string, mimeType: string): Promise<string> {
  // =====================================================================
  // OCR Integration Point
  // =====================================================================
  // In production, integrate with services like:
  // - Tesseract.js for client-side OCR
  // - Google Cloud Vision API
  // - AWS Textract
  // - Azure Computer Vision
  // =====================================================================

  console.log(`[OCR] Processing file: ${mimeType}`);

  // For demo purposes, return placeholder
  // In production, implement actual OCR:
  /*
  if (mimeType.startsWith('image/')) {
    const response = await fetch(signedUrl);
    const buffer = await response.arrayBuffer();
    const text = await performOCR(buffer, mimeType);
    return text;
  }

  if (mimeType === 'application/pdf') {
    const response = await fetch(signedUrl);
    const buffer = await response.arrayBuffer();
    const text = await extractPDFText(buffer);
    return text;
  }
  */

  // Placeholder implementation
  return Promise.resolve(
    "Placeholder OCR text. Integrate actual OCR service for production. " +
    "This would contain extracted text from images or PDFs."
  );
}

function buildDoctorSummaryPrompt(
  patientData: any,
  reportText: string
): string {
  const prompt = `You are a hospital-grade clinical assistant for licensed clinicians. You MUST produce structured JSON only. DO NOT provide medical diagnoses. DO NOT hallucinate. Use conservative clinical language. Always include source_snippet for every flagged item.

**CRITICAL SAFETY RULES:**
1. Never output definitive diagnoses (e.g., "patient has diabetes"). Use "may indicate", "suggests", "consider evaluating for"
2. Every flag MUST include exact source_snippet from report text
3. If data is unclear or missing, state "insufficient data" rather than guessing
4. Priority "critical" only for life-threatening indicators (e.g., severe abnormal values, chest pain, stroke symptoms)

**Patient Context:**
Name: ${patientData.full_name || "Unknown"}
Age: ${patientData.age || "Unknown"}
Gender: ${patientData.gender || "Unknown"}
Chronic Conditions: ${patientData.chronic_conditions?.join(", ") || "None reported"}
Allergies: ${patientData.allergies?.join(", ") || "None reported"}

**Report Text:**
${reportText}

**Required Output Format (valid JSON only):**
{
  "summary": "2-3 sentence clinical summary highlighting key findings and context",
  "priority": "normal|urgent|critical",
  "flags": [
    {
      "label": "Parameter name (e.g., 'Glucose', 'Blood Pressure')",
      "value": "Measured value with units",
      "reason": "Why this is flagged (out of range, abnormal, etc.)",
      "source_snippet": "Exact text from report showing this value"
    }
  ],
  "questions": [
    "Suggested question 1 for patient clarification",
    "Suggested question 2 for patient clarification",
    "Suggested question 3 for patient clarification"
  ],
  "recommended_tests": [
    "Follow-up test 1 if indicated",
    "Follow-up test 2 if indicated"
  ]
}

**Example (DO NOT copy verbatim, adapt to actual report):**
{
  "summary": "Lipid panel shows elevated LDL cholesterol at 180 mg/dL and low HDL at 35 mg/dL, suggesting increased cardiovascular risk. Fasting glucose is borderline at 105 mg/dL. Given patient's hypertension history, comprehensive cardiovascular assessment is recommended.",
  "priority": "urgent",
  "flags": [
    {
      "label": "LDL Cholesterol",
      "value": "180 mg/dL",
      "reason": "Significantly elevated; optimal is <100 mg/dL, high risk is >160 mg/dL",
      "source_snippet": "LDL Cholesterol: 180 mg/dL (Reference: <100 mg/dL)"
    },
    {
      "label": "HDL Cholesterol",
      "value": "35 mg/dL",
      "reason": "Low; protective level is >40 mg/dL for men, >50 mg/dL for women",
      "source_snippet": "HDL Cholesterol: 35 mg/dL (Reference: >40 mg/dL)"
    },
    {
      "label": "Fasting Glucose",
      "value": "105 mg/dL",
      "reason": "Borderline elevated; normal is <100 mg/dL, prediabetic range is 100-125 mg/dL",
      "source_snippet": "Fasting Glucose: 105 mg/dL (Reference: 70-99 mg/dL)"
    }
  ],
  "questions": [
    "Are you currently taking any cholesterol-lowering medications?",
    "Have you experienced any chest pain, shortness of breath, or unusual fatigue recently?",
    "What does your typical daily diet include?"
  ],
  "recommended_tests": [
    "HbA1c test to assess long-term glucose control",
    "Comprehensive metabolic panel",
    "Cardiac stress test if symptomatic"
  ]
}

Now analyze the actual report provided above and return ONLY valid JSON following this schema.`;

  return prompt;
}

function validateAISummary(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required top-level keys
  const requiredKeys = ["summary", "priority", "flags", "questions", "recommended_tests"];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      errors.push(`Missing required key: ${key}`);
    }
  }

  // Validate priority
  if (data.priority && !["normal", "urgent", "critical"].includes(data.priority)) {
    errors.push(`Invalid priority: ${data.priority}. Must be normal|urgent|critical`);
  }

  // Validate flags array
  if (data.flags && Array.isArray(data.flags)) {
    data.flags.forEach((flag: any, idx: number) => {
      const flagKeys = ["label", "value", "reason", "source_snippet"];
      flagKeys.forEach((key) => {
        if (!(key in flag)) {
          errors.push(`Flag[${idx}] missing required key: ${key}`);
        }
      });
    });
  } else if (data.flags) {
    errors.push("flags must be an array");
  }

  // Validate questions array
  if (data.questions && !Array.isArray(data.questions)) {
    errors.push("questions must be an array");
  }

  // Validate recommended_tests array
  if (data.recommended_tests && !Array.isArray(data.recommended_tests)) {
    errors.push("recommended_tests must be an array");
  }

  return { valid: errors.length === 0, errors };
}

async function callGeminiAPI(prompt: string, retryCount = 0): Promise<AISummary> {
  const maxRetries = 1;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 700,
      topP: 1,
      topK: 1,
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
    throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
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
  let aiSummary: any;
  try {
    // Gemini sometimes wraps JSON in ```json ... ``` markdown
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : rawText;
    aiSummary = JSON.parse(jsonText.trim());
  } catch (parseError) {
    console.error(`[JSON Parse Error] Raw text: ${rawText}`);
    if (retryCount < maxRetries) {
      console.log(`[Retry] Attempting retry ${retryCount + 1}/${maxRetries}`);
      return callGeminiAPI(prompt, retryCount + 1);
    }
    throw new Error(`Failed to parse Gemini JSON response after ${maxRetries + 1} attempts`);
  }

  // Validate JSON schema
  const validation = validateAISummary(aiSummary);
  if (!validation.valid) {
    console.error(`[Validation Error] ${validation.errors.join(", ")}`);
    if (retryCount < maxRetries) {
      console.log(`[Retry] Validation failed, attempting retry ${retryCount + 1}/${maxRetries}`);
      return callGeminiAPI(prompt, retryCount + 1);
    }
    throw new Error(`AI validation failed: ${validation.errors.join(", ")}`);
  }

  return aiSummary as AISummary;
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
    // 2. AUTHENTICATE USER
    // =====================================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.UNAUTHORIZED, message: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.UNAUTHORIZED, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // =====================================================================
    // 3. PARSE REQUEST
    // =====================================================================
    const requestBody: AISummaryRequest = await req.json();
    const { report_id, force_reprocess } = requestBody;

    if (!report_id) {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST", message: "report_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 4. FETCH REPORT & VERIFY ACCESS
    // =====================================================================
    const { data: report, error: reportError } = await supabaseClient
      .from("reports")
      .select(`
        *,
        patients!inner(id, user_id, full_name, date_of_birth, gender, chronic_conditions, allergies)
      `)
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      console.error(`[Report Fetch Error] ${reportError?.message}`);
      return new Response(
        JSON.stringify({ error: ERROR_CODES.REPORT_NOT_FOUND }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is patient (owns report) or doctor (has consent)
    const isPatient = report.patients.user_id === userId;
    let isDoctor = false;
    let doctorId = null;

    if (!isPatient) {
      // Check doctor consent
      const { data: doctor } = await supabaseClient
        .from("doctors")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (doctor) {
        doctorId = doctor.id;
        const { data: consent } = await supabaseClient
          .from("consents")
          .select("*")
          .eq("patient_id", report.patients.id)
          .eq("doctor_id", doctor.id)
          .eq("granted", true)
          .or(`report_id.is.null,report_id.eq.${report_id}`)
          .or("expires_at.is.null,expires_at.gt.now()")
          .single();

        if (consent) {
          isDoctor = true;
        }
      }
    }

    if (!isPatient && !isDoctor) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.NO_CONSENT, message: "No access to this report" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 5. CHECK IF ALREADY PROCESSED
    // =====================================================================
    if (report.ai_summary && !force_reprocess) {
      await supabaseClient.from("audit_log").insert({
        actor: userId,
        action: "ai_summary_retrieved",
        entity: "reports",
        entity_id: report_id,
        meta: { cached: true },
      });

      return new Response(
        JSON.stringify({ ok: true, ai_summary: report.ai_summary, cached: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 6. GENERATE SIGNED URL FOR FILE ACCESS
    // =====================================================================
    const { data: signedUrlData, error: signedError } = await supabaseClient.storage
      .from("reports")
      .createSignedUrl(report.file_path, 300); // 5 minutes

    if (signedError || !signedUrlData) {
      console.error(`[Signed URL Error] ${signedError?.message}`);
      return new Response(
        JSON.stringify({ error: ERROR_CODES.INTERNAL_ERROR, message: "Failed to access file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 7. EXTRACT TEXT (OCR IF NEEDED)
    // =====================================================================
    let fileText = report.file_text;

    if (!fileText || force_reprocess) {
      const needsOCR = report.file_mime?.startsWith("image/") || report.file_mime === "application/pdf";

      if (needsOCR) {
        try {
          fileText = await extractTextFromFile(signedUrlData.signedUrl, report.file_mime);

          // Update report with OCR text
          await supabaseClient
            .from("reports")
            .update({ file_text: fileText, ocr_processed: true })
            .eq("id", report_id);
        } catch (ocrError) {
          console.error(`[OCR Error] ${ocrError}`);
          return new Response(
            JSON.stringify({ error: ERROR_CODES.OCR_FAILED, message: "OCR processing failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (!fileText) {
      return new Response(
        JSON.stringify({ error: "NO_TEXT_CONTENT", message: "Report has no text content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 8. BUILD PROMPT & CALL GEMINI
    // =====================================================================
    const patientAge = report.patients.date_of_birth
      ? new Date().getFullYear() - new Date(report.patients.date_of_birth).getFullYear()
      : null;

    const patientData = {
      full_name: report.patients.full_name,
      age: patientAge,
      gender: report.patients.gender,
      chronic_conditions: report.patients.chronic_conditions,
      allergies: report.patients.allergies,
    };

    const prompt = buildDoctorSummaryPrompt(patientData, fileText);
    let aiSummary: AISummary;

    try {
      aiSummary = await callGeminiAPI(prompt);
    } catch (aiError) {
      console.error(`[Gemini Error] ${aiError}`);

      // Store raw error for debugging
      await supabaseClient.from("reports").update({
        ai_summary_raw: aiError instanceof Error ? aiError.message : String(aiError),
      }).eq("id", report_id);

      return new Response(
        JSON.stringify({ error: ERROR_CODES.AI_REQUEST_FAILED, message: String(aiError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 9. SAVE AI SUMMARY & TAGS
    // =====================================================================
    const aiTags = aiSummary.flags.map((flag) => flag.label);

    await supabaseClient.from("reports").update({
      ai_summary: aiSummary,
      ai_tags: aiTags,
      ai_processed_at: new Date().toISOString(),
    }).eq("id", report_id);

    // =====================================================================
    // 10. AUDIT LOG
    // =====================================================================
    await supabaseClient.from("audit_log").insert({
      actor: userId,
      action: "ai_summary_generated",
      entity: "reports",
      entity_id: report_id,
      meta: {
        priority: aiSummary.priority,
        flags_count: aiSummary.flags.length,
        model: GEMINI_MODEL,
      },
    });

    // =====================================================================
    // 11. REALTIME NOTIFICATION (if critical and doctor has consent)
    // =====================================================================
    if (aiSummary.priority === "critical") {
      // Find all doctors with consent
      const { data: consents } = await supabaseClient
        .from("consents")
        .select("doctor_id, doctors!inner(user_id)")
        .eq("patient_id", report.patients.id)
        .eq("granted", true)
        .or(`report_id.is.null,report_id.eq.${report_id}`)
        .or("expires_at.is.null,expires_at.gt.now()");

      if (consents && consents.length > 0) {
        // Send realtime notifications to doctor channels
        for (const consent of consents) {
          const channel = `doctor:${consent.doctor_id}:notifications`;
          await supabaseClient.channel(channel).send({
            type: "broadcast",
            event: "critical_report",
            payload: {
              report_id,
              patient_id: report.patients.id,
              patient_name: report.patients.full_name,
              priority: aiSummary.priority,
              summary: aiSummary.summary,
            },
          });
        }
      }
    }

    // =====================================================================
    // 12. RETURN SUCCESS
    // =====================================================================
    return new Response(
      JSON.stringify({ ok: true, ai_summary: aiSummary, priority: aiSummary.priority }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[Unhandled Error] ${error}`);
    return new Response(
      JSON.stringify({
        error: ERROR_CODES.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
