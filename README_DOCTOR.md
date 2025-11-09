# Doctor Portal - Healthcare SaaS Platform

**Production-Grade Doctor Portal with Supabase + Google Gemini AI Integration**

> ⚕️ **Medical Disclaimer**: This platform provides AI-assisted clinical insights for informational purposes only. All outputs must be reviewed by licensed healthcare professionals. Not a substitute for professional medical judgment.

---

## 🎯 Overview

A complete, production-ready doctor portal featuring:

- **🤖 AI-Powered Report Analysis** using Google Gemini for clinical insights
- **📅 Smart Appointment Management** with integrated video consultations
- **🔒 HIPAA-Compliant Security** with Row-Level Security (RLS) policies
- **💬 Secure Messaging** between doctors and patients
- **📊 Real-time Notifications** for critical findings
- **🎨 Apple-Inspired UI** with Tailwind CSS and Framer Motion

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Setup](#environment-setup)
6. [Database Setup](#database-setup)
7. [Edge Functions Deployment](#edge-functions-deployment)
8. [Running the Application](#running-the-application)
9. [Demo Script](#demo-script)
10. [Testing](#testing)
11. [API Documentation](#api-documentation)
12. [Security & Compliance](#security--compliance)
13. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### For Doctors

- **Dashboard**: Calendar-based appointment view with patient details
- **AI Report Analysis**: Automated clinical summary with flagged values
- **Consultation Management**: Video meetings with integrated notes
- **Patient Records**: Access to medical history with consent
- **Secure Messaging**: HIPAA-compliant communication
- **Annotations**: Add clinical notes to reports
- **Audit Trail**: Complete activity logging

### For Patients

- **Report Upload**: Easy medical document submission
- **Consent Management**: Granular control over data sharing
- **Appointment Booking**: Self-service scheduling
- **Secure Chat**: Direct communication with doctors

### AI Capabilities

- **Clinical Summarization**: 2-3 sentence report summaries
- **Risk Flagging**: Automated detection of abnormal values
- **Source Attribution**: Every flag linked to source snippet
- **Priority Classification**: Normal / Urgent / Critical
- **Question Suggestions**: Recommended patient questions
- **Test Recommendations**: Follow-up testing guidance

---

## 🛠 Tech Stack

### Backend
- **Supabase**: PostgreSQL database, Auth, Storage, Realtime
- **Edge Functions**: Deno-based serverless functions
- **Google Gemini**: AI model for clinical analysis (gemini-2.0-flash-exp)

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **FullCalendar**: Appointment scheduling
- **PDF.js**: Document viewing

### Testing
- **Playwright**: E2E testing
- **Supabase Local**: Local development environment

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **Supabase Account** (free tier works)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))
- **Git** for version control

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd healthcare
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install Supabase CLI

```bash
npm install -g supabase
```

---

## 🔐 Environment Setup

### Create Environment Files

Create `.env.local` in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google Gemini API (NEVER expose in frontend)
GEMINI_API_KEY=your-gemini-api-key-here

# Environment
NODE_ENV=development

# Optional: For local development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

### ⚠️ Security Warning

**CRITICAL**: Never commit `.env.local` to version control. The `GEMINI_API_KEY` must only be used in Edge Functions (server-side), never in frontend code.

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore
```

---

## 🗄 Database Setup

### 1. Initialize Supabase Project

```bash
supabase init
supabase start
```

### 2. Run Migrations

```bash
# Apply schema migration
supabase db reset

# Or manually apply migrations
psql $DATABASE_URL -f migrations/001_doctor_schema.sql
psql $DATABASE_URL -f migrations/002_policies.sql
```

### 3. Verify Database Setup

```bash
supabase db diff
```

You should see:
- ✅ 7 tables created (patients, doctors, appointments, reports, consents, messages, audit_log)
- ✅ RLS policies enabled on all tables
- ✅ Seed data inserted (demo doctor and patient)

### 4. Update Seed Data User IDs

**Important**: The seed data uses placeholder UUIDs. You must replace them with actual `auth.users` IDs after creating test users.

#### Create Test Users via Supabase Dashboard:

1. Go to Authentication > Users
2. Create users:
   - **Doctor**: `dr.sarah.mitchell@healthportal.demo`
   - **Patient**: `john.anderson@patient.demo`
3. Copy their UUIDs
4. Update the seed data:

```sql
-- Update doctor user_id
UPDATE public.doctors
SET user_id = 'actual-doctor-auth-uuid'
WHERE email = 'dr.sarah.mitchell@healthportal.demo';

-- Update patient user_id
UPDATE public.patients
SET user_id = 'actual-patient-auth-uuid'
WHERE email = 'john.anderson@patient.demo';
```

---

## ⚡ Edge Functions Deployment

### 1. Navigate to Functions Directory

```bash
cd supabase/functions
```

### 2. Deploy Reports Analyze Function

```bash
supabase functions deploy reports_analyze --no-verify-jwt
```

Set environment variables:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

### 3. Deploy Messages Send Function

```bash
supabase functions deploy messages_send --no-verify-jwt
```

### 4. Test Edge Functions Locally

```bash
# Start local edge functions
supabase functions serve

# Test reports_analyze
curl -X POST http://localhost:54321/functions/v1/reports_analyze \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_id": "uuid-here"}'
```

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

Visit: `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

### With Docker (Optional)

```bash
docker-compose up
```

---

## 🎬 Demo Script (2-Minute Walkthrough)

This demo showcases the complete doctor-patient workflow with AI report analysis.

### Prerequisites
- Both demo users created (doctor and patient)
- Test PDF report file ready (sample included: `tests/fixtures/lab-report-sample.pdf`)

### Demo Steps

#### Step 1: Patient Uploads Report (30 seconds)

1. **Login as Patient**: `john.anderson@patient.demo`
2. Navigate to **Reports** → **Upload Report**
3. Upload `lab-report-sample.pdf`
4. Fill in:
   - **Title**: "Lipid Panel - January 2024"
   - **Type**: Lab Report
   - **Date**: Today's date
5. Click **Upload**
6. Navigate to **Consents** → **Grant Access to Dr. Sarah Mitchell**
7. Check **"Share all reports"** and **"Enable AI Analysis"**
8. Click **Grant Consent**

**Expected Result**: ✅ Report uploaded, consent granted

---

#### Step 2: Doctor Receives Notification (15 seconds)

1. **Login as Doctor**: `dr.sarah.mitchell@healthportal.demo`
2. Observe **notification bell** in top-right (red badge)
3. Click **Bell icon** → See "New Report Shared by John Anderson"

**Expected Result**: ✅ Real-time notification received

---

#### Step 3: AI Analysis (45 seconds)

1. From Dashboard, click **Patients** tab
2. Select **John Anderson**
3. **Patient Rail** opens on right side showing:
   - Patient demographics
   - Medical overview (allergies, conditions)
   - Recent reports list
4. Click on **"Lipid Panel - January 2024"** report
5. **Report Viewer** modal opens
6. Click **AI Summary** tab
7. Click **AI Summarize** button (purple gradient)
8. Watch **"Analyzing..."** spinner (takes 30-45 seconds)
9. AI Summary appears with:
   - ✅ **Clinical Summary**: 2-3 sentence overview
   - ✅ **Priority Badge**: Normal/Urgent/Critical
   - ✅ **Flagged Values**: Each with source snippet
   - ✅ **Suggested Questions**: 3 recommended questions
   - ✅ **Recommended Tests**: Follow-up testing
   - ✅ **Disclaimer**: Medical advice warning

**Expected Result**: ✅ AI summary generated within 45 seconds

---

#### Step 4: Doctor Reviews and Annotates (20 seconds)

1. Review each **Flagged Value**
2. Verify **source_snippet** is present for each flag
3. Click **Annotations** tab
4. Add annotation:
   ```
   Reviewed with patient. LDL significantly elevated.
   Recommended dietary modifications and statin therapy.
   Follow-up in 6 weeks with repeat lipid panel.
   ```
5. Click **Save Annotation**

**Expected Result**: ✅ Annotation saved and audit logged

---

#### Step 5: Start Consultation (30 seconds)

1. Close Report Viewer
2. In Patient Rail, click **Start Consultation** button
3. **Consultation Modal** opens showing:
   - Patient info
   - Video meeting link
   - Timer (currently 00:00)
4. Click **Start Consultation** button
   - Meet link opens in new tab
   - Timer starts counting
5. In **Consultation Notes** field, add:
   ```
   Discussed lipid panel results. Patient understands
   cardiovascular risk. Prescribed Atorvastatin 20mg daily.
   Advised on DASH diet and exercise plan.
   Follow-up: 6 weeks with repeat labs.
   ```
6. Click **Complete & Save Notes**

**Expected Result**: ✅ Consultation marked as "in progress", notes saved

---

### Demo Metrics

- ⏱️ **Upload to AI Summary**: ~45 seconds
- 🎯 **Total Demo Time**: 2 minutes
- ✅ **Features Showcased**:
  - Patient upload
  - Consent management
  - Real-time notifications
  - AI report analysis
  - Source attribution
  - Clinical annotations
  - Video consultations
  - Audit logging

---

## 🧪 Testing

### Run E2E Tests

```bash
# Install Playwright
npx playwright install

# Run tests
npm run test:e2e

# Run specific test suite
npx playwright test doctor_e2e.spec.ts

# Run in UI mode (recommended)
npx playwright test --ui
```

### Test Coverage

- ✅ Doctor login and dashboard
- ✅ Patient report upload
- ✅ AI summary generation
- ✅ Consent verification
- ✅ Realtime notifications
- ✅ Consultation workflow
- ✅ Report annotations
- ✅ Secure messaging
- ✅ RLS policy enforcement
- ✅ Accessibility compliance

### Unit Tests (Optional)

```bash
npm run test
```

---

## 📚 API Documentation

Full OpenAPI specification: `api_contracts/doctor_api.yaml`

### Key Endpoints

#### 1. Analyze Report

```bash
POST /functions/v1/reports_analyze
Authorization: Bearer {jwt_token}

{
  "report_id": "uuid",
  "force_reprocess": false
}
```

**Response**:
```json
{
  "ok": true,
  "priority": "urgent",
  "ai_summary": {
    "summary": "...",
    "priority": "urgent",
    "flags": [...],
    "questions": [...],
    "recommended_tests": [...]
  }
}
```

#### 2. Send Message

```bash
POST /functions/v1/messages_send
Authorization: Bearer {jwt_token}

{
  "recipient_id": "uuid",
  "content": "Message text"
}
```

#### 3. List Reports

```bash
GET /rest/v1/reports?patient_id=eq.{uuid}
Authorization: Bearer {jwt_token}
```

---

## 🔒 Security & Compliance

### HIPAA Compliance Features

- ✅ **Encryption at Rest**: Supabase PostgreSQL encryption
- ✅ **Encryption in Transit**: HTTPS/TLS for all communications
- ✅ **Access Control**: RLS policies enforce consent-based access
- ✅ **Audit Logging**: Complete audit trail in `audit_log` table
- ✅ **Data Minimization**: Only authorized data accessible
- ✅ **Breach Notification**: Real-time alerts for critical findings

### RLS Policy Examples

**Reports Access**:
```sql
-- Doctors can only view reports with active consent
CREATE POLICY reports_select_doctor_with_consent ON reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM consents c
    INNER JOIN doctors d ON d.id = c.doctor_id
    WHERE d.user_id = auth.uid()
      AND c.patient_id = reports.patient_id
      AND c.granted = true
      AND (c.expires_at IS NULL OR c.expires_at > NOW())
  )
);
```

### AI Safety Measures

1. **Conservative Language**: No definitive diagnoses
2. **Source Attribution**: Every flag has `source_snippet`
3. **Temperature Control**: Set to 0.0 for deterministic output
4. **Validation**: JSON schema enforcement with retry logic
5. **Disclaimer**: Patient-facing disclaimer on all outputs

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "GEMINI_API_KEY not set" Error

**Solution**: Verify environment variable is set in Edge Functions:

```bash
supabase secrets list
supabase secrets set GEMINI_API_KEY=your-key
```

#### 2. RLS Policy Blocks Access

**Solution**: Verify consent exists:

```sql
SELECT * FROM consents
WHERE patient_id = 'patient-uuid'
  AND doctor_id = 'doctor-uuid'
  AND granted = true;
```

#### 3. AI Summary Validation Fails

**Solution**: Check Edge Function logs:

```bash
supabase functions logs reports_analyze
```

Look for `[Validation Error]` entries and verify JSON schema.

#### 4. Signed URL Expired

**Solution**: Signed URLs are valid for 1 hour. Refresh the report viewer.

#### 5. Realtime Notifications Not Working

**Solution**: Verify Realtime is enabled in Supabase Dashboard:

1. Go to **Database** → **Replication**
2. Enable replication for `messages` and `reports` tables

---

## 📁 Project Structure

```
healthcare/
├── migrations/
│   ├── 001_doctor_schema.sql       # Database schema
│   └── 002_policies.sql            # RLS policies
├── supabase/functions/
│   ├── reports_analyze/
│   │   └── index.ts                # AI analysis function
│   └── messages_send/
│       └── index.ts                # Messaging function
├── frontend/
│   ├── doctor/
│   │   └── Dashboard.tsx           # Main dashboard
│   └── components/
│       ├── DoctorSidebar.tsx
│       ├── PatientRail.tsx
│       ├── AIActionCard.tsx
│       ├── ReportViewer.tsx
│       ├── StartConsultModal.tsx
│       └── ChatDock.tsx
├── api_contracts/
│   └── doctor_api.yaml             # OpenAPI spec
├── tests/
│   ├── doctor_e2e.spec.ts          # E2E tests
│   └── fixtures/
│       └── lab-report-sample.pdf
├── README_DOCTOR.md                # This file
└── .env.local                      # Environment variables (gitignored)
```

---

## 🎨 Design Tokens (Apple Theme)

```css
/* Colors */
--accent-blue: #0A84FF;
--surface: #FFFFFF;
--background: #F6F7F8;
--text-primary: #1C1C1E;
--text-secondary: #8E8E93;

/* Borders */
--border-radius: 12px;  /* rounded-2xl */

/* Shadows */
--shadow-card: 0 6px 20px rgba(0,0,0,0.06);

/* Spacing */
--spacing-base: 24px;   /* p-6 */
```

---

## 🚢 Deployment

### Deploy to Vercel

```bash
vercel --prod
```

### Deploy to Supabase (Recommended)

1. Push to GitHub
2. Link repository in Supabase Dashboard
3. Set environment variables in **Settings** → **Environment Variables**
4. Deploy Edge Functions:

```bash
supabase functions deploy --project-ref your-project-ref
```

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/healthcare/issues)
- **Email**: support@healthportal.demo
- **Docs**: [Supabase Docs](https://supabase.com/docs) | [Gemini Docs](https://ai.google.dev/docs)

---

## 📄 License

MIT License - see LICENSE file for details

---

## ⚠️ Final Reminders

### Before Production Deployment:

- [ ] Replace all demo UUIDs with actual user IDs
- [ ] Set up proper backup strategy
- [ ] Enable Supabase Point-in-Time Recovery (PITR)
- [ ] Configure rate limiting on Edge Functions
- [ ] Set up monitoring and alerting
- [ ] Complete HIPAA Business Associate Agreement (BAA) with Supabase
- [ ] Conduct security audit
- [ ] Test disaster recovery procedures
- [ ] Set up SSL certificates for custom domain
- [ ] Configure CORS policies for production URLs

### Security Checklist:

- [ ] ✅ GEMINI_API_KEY is server-side only
- [ ] ✅ RLS policies enabled on all tables
- [ ] ✅ Audit logging for all sensitive operations
- [ ] ✅ Input validation on all forms
- [ ] ✅ XSS protection (content sanitization)
- [ ] ✅ CSRF tokens implemented
- [ ] ✅ Rate limiting on API endpoints
- [ ] ✅ Secure password policies enforced
- [ ] ✅ MFA enabled for admin accounts

---

**Built with ❤️ for Healthcare Professionals**

*This platform is informational only and not a substitute for professional medical advice. Always consult licensed healthcare providers for medical decisions.*
