// =====================================================================
// Edge Function: AI Health Consultant Chat
// Description: Conversational AI health assistant using Google Gemini
// Security: Patient-only access, medical disclaimers, conservative responses
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
// TYPES & INTERFACES
// =====================================================================

interface ChatRequest {
  message: string;
  session_id?: string;
  context_report_ids?: string[];
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
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

const MEDICAL_DISCLAIMER =
  "\n\n⚕️ **Medical Disclaimer**: This AI assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.";

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "heart attack",
  "stroke",
  "can't breathe",
  "difficulty breathing",
  "severe bleeding",
  "suicide",
  "overdose",
  "unconscious",
  "severe pain",
  "head injury"
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

function detectEmergency(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

function buildSystemPrompt(patientData: any, reportsContext: any[]): string {
  const age = patientData.date_of_birth
    ? new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear()
    : "unknown";

  const reportsInfo = reportsContext.length > 0
    ? reportsContext.map(r => `- ${r.title} (${r.report_date || 'recent'}): ${r.ai_summary?.summary || 'No summary available'}`).join("\n")
    : "No recent reports available";

  return `You are a compassionate AI health consultant providing general health information and guidance.

**CRITICAL SAFETY RULES:**
1. NEVER provide definitive medical diagnoses
2. ALWAYS use conservative, cautious language (e.g., "may indicate", "consider discussing with your doctor")
3. NEVER prescribe medications or specific treatments
4. ALWAYS recommend consulting healthcare professionals for medical decisions
5. If the question suggests an emergency, IMMEDIATELY recommend calling emergency services
6. Include the medical disclaimer at the end of EVERY response
7. Reference patient's medical history when relevant, but don't make assumptions

**Patient Profile:**
- Age: ${age} years
- Gender: ${patientData.gender || "Not specified"}
- Chronic Conditions: ${patientData.chronic_conditions?.join(", ") || "None reported"}
- Allergies: ${patientData.allergies?.join(", ") || "None reported"}

**Recent Medical Reports:**
${reportsInfo}

**Your Communication Style:**
- Warm, empathetic, and supportive
- Clear and easy to understand (avoid excessive medical jargon)
- Evidence-based when possible
- Always err on the side of caution
- Encourage healthy behaviors and medical follow-up

**Example Responses:**

User: "My blood sugar was 180 this morning. Is that bad?"
Assistant: "A blood sugar level of 180 mg/dL is elevated, especially if it's a fasting reading. Normal fasting blood sugar is typically below 100 mg/dL. Based on your medical history, this is worth discussing with your doctor. They may want to review your diabetes management plan, including diet, exercise, and medications. In the meantime, consider:
- Monitoring your blood sugar regularly
- Reviewing what you ate before the test
- Staying hydrated
- Light physical activity if your doctor has cleared you for it

Your doctor can provide personalized guidance based on your complete health picture.${MEDICAL_DISCLAIMER}"

User: "I'm having severe chest pain right now"
Assistant: "🚨 **This sounds like a medical emergency.** Severe chest pain can be a sign of a heart attack or other serious condition. Please:

1. **Call emergency services (911) IMMEDIATELY**
2. If you have aspirin and are not allergic, chew one 325mg aspirin
3. Stop all activity and sit or lie down
4. If someone is with you, tell them
5. Do NOT drive yourself to the hospital

This is not something to wait on or manage at home. Please seek emergency care right away.${MEDICAL_DISCLAIMER}"

Now respond to the patient's question with similar care and caution.`;
}

async function callGeminiChat(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  // Build conversation history for Gemini
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "I understand. I will provide compassionate, evidence-based health information while maintaining strict safety protocols and always recommending professional medical consultation." }] },
    ...messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }))
  ];

  const requestBody = {
    contents: contents,
    generationConfig: {
      temperature: 0.7, // More conversational
      maxOutputTokens: 800,
      topP: 0.95,
      topK: 40,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_MEDICAL",
        threshold: "BLOCK_NONE"
      }
    ]
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

  // Add disclaimer if not present
  if (!rawText.includes("Medical Disclaimer")) {
    return rawText + MEDICAL_DISCLAIMER;
  }

  return rawText;
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
        JSON.stringify({ error: "NOT_PATIENT", message: "Only patients can use AI consultant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 4. PARSE REQUEST
    // =====================================================================
    const requestBody: ChatRequest = await req.json();
    const { message, session_id, context_report_ids } = requestBody;

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "INVALID_REQUEST", message: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 5. CHECK FOR EMERGENCY
    // =====================================================================
    const isEmergency = detectEmergency(message);
    if (isEmergency) {
      const emergencyResponse = `🚨 **This sounds like a medical emergency.**

Based on your message, this could be a serious medical situation that requires immediate attention. Please:

1. **Call emergency services (911 in the US) IMMEDIATELY** if you're experiencing:
   - Severe chest pain or pressure
   - Difficulty breathing
   - Signs of stroke (face drooping, arm weakness, speech difficulty)
   - Severe bleeding
   - Loss of consciousness
   - Thoughts of self-harm

2. **Do NOT wait** to see if symptoms improve
3. **Do NOT drive yourself** to the hospital if symptoms are severe
4. If this is less urgent but still concerning, contact your doctor's office or visit an urgent care clinic

I'm here to provide general health information, but this situation requires immediate professional medical attention.${MEDICAL_DISCLAIMER}`;

      // Log emergency detection
      await supabaseClient.from("audit_log").insert({
        actor: userId,
        action: "ai_consultant_emergency_detected",
        entity: "ai_consultations",
        meta: { message_preview: message.substring(0, 100) },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          response: emergencyResponse,
          is_emergency: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 6. GENERATE OR USE SESSION ID
    // =====================================================================
    const sessionId = session_id || crypto.randomUUID();

    // =====================================================================
    // 7. FETCH CONVERSATION HISTORY
    // =====================================================================
    const { data: conversationHistory } = await supabaseClient
      .from("ai_consultations")
      .select("role, content")
      .eq("patient_id", patient.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(20); // Last 20 messages for context

    const messages: ChatMessage[] = conversationHistory || [];

    // =====================================================================
    // 8. FETCH CONTEXT REPORTS
    // =====================================================================
    let reportsContext: any[] = [];
    if (context_report_ids && context_report_ids.length > 0) {
      const { data: reports } = await supabaseClient
        .from("reports")
        .select("id, title, report_date, ai_summary")
        .eq("patient_id", patient.id)
        .in("id", context_report_ids);
      reportsContext = reports || [];
    } else {
      // Fetch latest 3 reports
      const { data: reports } = await supabaseClient
        .from("reports")
        .select("id, title, report_date, ai_summary")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(3);
      reportsContext = reports || [];
    }

    // =====================================================================
    // 9. BUILD SYSTEM PROMPT & CALL GEMINI
    // =====================================================================
    const systemPrompt = buildSystemPrompt(patient, reportsContext);

    // Add user message to conversation
    messages.push({ role: "user", content: message });

    let aiResponse: string;
    try {
      aiResponse = await callGeminiChat(messages, systemPrompt);
    } catch (aiError) {
      console.error(`[Gemini Error] ${aiError}`);
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "Failed to generate response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 10. STORE CONVERSATION
    // =====================================================================
    const reportIds = reportsContext.map(r => r.id);

    // Store user message
    await supabaseClient.from("ai_consultations").insert({
      patient_id: patient.id,
      session_id: sessionId,
      role: "user",
      content: message,
      context_reports: reportIds,
    });

    // Store AI response
    await supabaseClient.from("ai_consultations").insert({
      patient_id: patient.id,
      session_id: sessionId,
      role: "assistant",
      content: aiResponse,
      context_reports: reportIds,
    });

    // =====================================================================
    // 11. AUDIT LOG
    // =====================================================================
    await supabaseClient.from("audit_log").insert({
      actor: userId,
      action: "ai_consultant_chat",
      entity: "ai_consultations",
      entity_id: sessionId,
      meta: {
        message_length: message.length,
        response_length: aiResponse.length,
        reports_referenced: reportIds.length,
      },
    });

    // =====================================================================
    // 12. RETURN RESPONSE
    // =====================================================================
    return new Response(
      JSON.stringify({
        ok: true,
        response: aiResponse,
        session_id: sessionId,
        is_emergency: false
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
