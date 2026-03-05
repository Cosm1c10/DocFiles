#  DocFiles: AI-Powered Healthcare Portal

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A comprehensive, full-stack healthcare platform that bridges the gap between doctors and patients using advanced AI integrations. Built with Next.js, TypeScript, and Supabase, this platform offers distinct, secure portals for medical professionals and patients, featuring AI-driven medical report analysis, intelligent meal tracking, and secure consultation workflows.

##  Key Features

###  Doctor Portal
* **Patient Management Dashboard:** Seamlessly track patient progress, health metrics, and active consultations.
* **AI Consultant Chat:** Intelligent medical assistant powered by Supabase Edge Functions to help analyze patient data.
* **Automated Report Analysis:** Extract insights from uploaded patient medical reports instantly.
* **Secure Messaging:** Compliant, encrypted messaging system between doctors and patients.

###  Patient Portal
* **Interactive Dashboard:** Centralized view of personal health metrics, medical reports, and upcoming consultations.
* **AI Meal Tracker & Nutrition Analysis:** Log food intake and receive instant, AI-generated nutritional breakdowns.
* **Custom Meal Plan Generation:** Automated dietary planning tailored to patient-specific health profiles.
* **Medical Report Viewer:** Securely view and manage personal medical documents.

###  Security & Architecture
* **Role-Based Access Control (RBAC):** Strict Supabase Row Level Security (RLS) policies segregating Doctor and Patient data.
* **Edge Functions:** Serverless AI logic executed securely via Supabase Edge Functions.

---

##  Technology Stack

* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
* **Backend:** Supabase (PostgreSQL Database, Authentication, Storage)
* **AI & Serverless:** Supabase Edge Functions
* **Testing:** Playwright (E2E Testing)
* **API Contracts:** OpenAPI / Swagger (YAML)

---

##  Project Structure

```text
├── api_contracts/         # OpenAPI specifications for backend services
├── app/                   # Next.js App Router (Pages & Layouts)
│   ├── auth/              # Login, Signup, and Password Recovery
│   └── patient/           # Patient-facing routes
├── frontend/              # Shared UI components and portal logic
│   ├── components/        # Reusable UI (Sidebars, Modals, Action Cards)
│   ├── doctor/            # Doctor-specific views
│   ├── patient/           # Patient-specific views
│   ├── lib/               # Utility functions and Supabase client
│   └── types/             # TypeScript type definitions
├── migrations/            # Supabase SQL database schemas and RLS policies
├── supabase/functions/    # AI and backend Edge Functions
└── tests/                 # End-to-End tests (Playwright)

Getting Started
Prerequisites
Node.js 18+

npm or yarn

Supabase CLI (for local development)

1. Clone the repository
Bash
git clone [https://github.com/yourusername/DocFiles.git](https://github.com/yourusername/DocFiles.git)
cd DocFiles
2. Install dependencies
Bash
npm install
3. Environment Setup
Copy the example environment file and fill in your Supabase credentials:

Bash
cp .env.example .env.local
(Ensure you add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)

4. Database Setup
Apply the database migrations and setup Row Level Security (RLS) policies:

Bash
supabase start
supabase db push
(Migrations are located in the /migrations folder and execute in sequential order).

5. Run the Development Server
Bash
npm run dev
Open http://localhost:3000 with your browser to see the result.

 Documentation & Guides
To fully understand and navigate the project, refer to the included documentation files:

Doctor Portal Guide - Features and workflows for medical professionals.

Patient Portal Guide - Features and workflows for patients.

Preview Guide - Instructions for exploring the UI/UX.

Test Credentials - Login information for demo accounts.

Deliverables Checklist - Project scope and completion status.

 Testing
This project uses Playwright for End-to-End (E2E) testing. To run the test suite:

Bash
npx playwright test
Check the /tests directory for specific test files like doctor_e2e.spec.ts.

 License
This project is licensed under the MIT License - see the LICENSE file for details.


### Why this README hits the mark:
* **High Visual Appeal:** Badges and emojis make it immediately scannable. 
* **Clear Value Proposition:** It clearly defines *what* the repo does (Dual-portal AI healthcare) right at the top.
* **Highlights your AI capabilities:** It brings your Edge Functions (Nutrition analysis, Meal planning, Consultant chat) front and center, which reinforces your branding as an AI/Automation builder. 
* **Navigational:** It points reviewers directly to your other internal markdown files (`README_DOCTOR.md`, `TEST_CREDENTIALS.md`, etc.), ensuring they don't get lost in the repository.
