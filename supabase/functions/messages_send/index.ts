// =====================================================================
// Edge Function: Secure Message Sending
// Description: Server-validated messaging between doctors and patients
// Security: Auth validation, relationship verification, audit logging
// =====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
// TYPES & INTERFACES
// =====================================================================

interface SendMessageRequest {
  recipient_id: string;
  content: string;
  appointment_id?: string;
  message_type?: "text" | "file" | "template";
  file_path?: string;
  file_mime?: string;
  metadata?: Record<string, any>;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables?: string[];
}

// =====================================================================
// CONSTANTS
// =====================================================================

const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_REQUEST: "INVALID_REQUEST",
  RECIPIENT_NOT_FOUND: "RECIPIENT_NOT_FOUND",
  NO_ACTIVE_RELATIONSHIP: "NO_ACTIVE_RELATIONSHIP",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "appointment_reminder",
    name: "Appointment Reminder",
    content: "Hi {{patient_name}}, this is a reminder about your appointment on {{date}} at {{time}}. Please let me know if you need to reschedule.",
    variables: ["patient_name", "date", "time"],
  },
  {
    id: "report_reviewed",
    name: "Report Reviewed",
    content: "I've reviewed your {{report_type}} results. {{summary}} Please feel free to ask any questions during our next consultation.",
    variables: ["report_type", "summary"],
  },
  {
    id: "prescription_ready",
    name: "Prescription Ready",
    content: "Your prescription for {{medication}} is ready. Please pick it up from {{pharmacy}} within the next 7 days.",
    variables: ["medication", "pharmacy"],
  },
  {
    id: "follow_up_needed",
    name: "Follow-up Needed",
    content: "Based on our recent consultation, I recommend scheduling a follow-up in {{timeframe}} to monitor your {{condition}}. Please book at your earliest convenience.",
    variables: ["timeframe", "condition"],
  },
];

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

function sanitizeContent(content: string): string {
  // Remove potentially dangerous HTML/script tags
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .trim();
}

function applyTemplate(templateId: string, variables: Record<string, string>): string {
  const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  let content = template.content;
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  return content;
}

async function verifyDoctorPatientRelationship(
  supabase: any,
  userId: string,
  recipientId: string
): Promise<{ valid: boolean; isDoctor: boolean; isPatient: boolean; appointmentExists: boolean }> {
  // Check if user is a doctor
  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (doctor) {
    // User is a doctor - verify recipient is their patient with active/recent appointment
    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id,
        patients!inner(user_id)
      `)
      .eq("doctor_id", doctor.id)
      .eq("patients.user_id", recipientId)
      .in("status", ["confirmed", "in_progress", "completed"])
      .gte("scheduled_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    return {
      valid: appointments && appointments.length > 0,
      isDoctor: true,
      isPatient: false,
      appointmentExists: appointments && appointments.length > 0,
    };
  }

  // Check if user is a patient
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (patient) {
    // User is a patient - verify recipient is their doctor with active/recent appointment
    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id,
        doctors!inner(user_id)
      `)
      .eq("patient_id", patient.id)
      .eq("doctors.user_id", recipientId)
      .in("status", ["confirmed", "in_progress", "completed"])
      .gte("scheduled_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    return {
      valid: appointments && appointments.length > 0,
      isDoctor: false,
      isPatient: true,
      appointmentExists: appointments && appointments.length > 0,
    };
  }

  return { valid: false, isDoctor: false, isPatient: false, appointmentExists: false };
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
    // 1. AUTHENTICATE USER
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
    // 2. PARSE & VALIDATE REQUEST
    // =====================================================================
    const requestBody: SendMessageRequest = await req.json();
    const {
      recipient_id,
      content: rawContent,
      appointment_id,
      message_type = "text",
      file_path,
      file_mime,
      metadata = {},
    } = requestBody;

    if (!recipient_id) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.INVALID_REQUEST, message: "recipient_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!rawContent && message_type === "text") {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.INVALID_REQUEST, message: "content is required for text messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (message_type === "file" && !file_path) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.INVALID_REQUEST, message: "file_path is required for file messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 3. VERIFY RECIPIENT EXISTS
    // =====================================================================
    const { data: recipientUser, error: recipientError } = await supabaseClient.auth.admin.getUserById(recipient_id);

    if (recipientError || !recipientUser) {
      return new Response(
        JSON.stringify({ error: ERROR_CODES.RECIPIENT_NOT_FOUND }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 4. VERIFY DOCTOR-PATIENT RELATIONSHIP
    // =====================================================================
    const relationship = await verifyDoctorPatientRelationship(supabaseClient, userId, recipient_id);

    if (!relationship.valid) {
      await supabaseClient.from("audit_log").insert({
        actor: userId,
        action: "message_send_blocked",
        entity: "messages",
        meta: {
          recipient_id,
          reason: "no_active_relationship",
        },
      });

      return new Response(
        JSON.stringify({
          error: ERROR_CODES.NO_ACTIVE_RELATIONSHIP,
          message: "No active doctor-patient relationship found",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 5. PROCESS MESSAGE CONTENT
    // =====================================================================
    let finalContent = rawContent;

    if (message_type === "template" && metadata.template_id) {
      try {
        finalContent = applyTemplate(metadata.template_id, metadata.variables || {});
      } catch (templateError) {
        return new Response(
          JSON.stringify({
            error: ERROR_CODES.INVALID_REQUEST,
            message: templateError instanceof Error ? templateError.message : "Template processing failed",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Sanitize content
    finalContent = sanitizeContent(finalContent);

    if (finalContent.length > 5000) {
      return new Response(
        JSON.stringify({
          error: ERROR_CODES.INVALID_REQUEST,
          message: "Message content exceeds 5000 characters",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 6. INSERT MESSAGE
    // =====================================================================
    const { data: message, error: insertError } = await supabaseClient
      .from("messages")
      .insert({
        sender_id: userId,
        recipient_id,
        appointment_id,
        content: finalContent,
        message_type,
        file_path,
        file_mime,
        metadata,
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error(`[Message Insert Error] ${insertError?.message}`);
      return new Response(
        JSON.stringify({ error: ERROR_CODES.INTERNAL_ERROR, message: "Failed to send message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================================================
    // 7. AUDIT LOG
    // =====================================================================
    await supabaseClient.from("audit_log").insert({
      actor: userId,
      action: "message_sent",
      entity: "messages",
      entity_id: message.id,
      meta: {
        recipient_id,
        message_type,
        appointment_id,
        is_doctor: relationship.isDoctor,
        is_patient: relationship.isPatient,
      },
    });

    // =====================================================================
    // 8. REALTIME NOTIFICATION
    // =====================================================================
    const channel = `user:${recipient_id}:messages`;
    await supabaseClient.channel(channel).send({
      type: "broadcast",
      event: "new_message",
      payload: {
        message_id: message.id,
        sender_id: userId,
        content: finalContent.substring(0, 100), // Preview
        message_type,
        created_at: message.created_at,
      },
    });

    // =====================================================================
    // 9. RETURN SUCCESS
    // =====================================================================
    return new Response(
      JSON.stringify({
        ok: true,
        message_id: message.id,
        created_at: message.created_at,
      }),
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

// =====================================================================
// TEMPLATES ENDPOINT (Optional - can be separate function)
// =====================================================================
// GET /messages/templates - Returns available message templates
