# Patient Portal - Comprehensive Guide

## 🎉 What's Been Built

### ✅ **Complete Features**

#### 1. **Database Schema** (`migrations/003_patient_features.sql`, `004_patient_policies.sql`)
- **7 New Tables**:
  - `health_metrics` - Daily health tracking (weight, BP, glucose, etc.)
  - `meal_logs` - Food intake with nutrition data
  - `meal_plans` - AI-generated personalized meal plans
  - `ai_consultations` - Chat history with AI consultant
  - `daily_goals` - Daily progress tracking
  - `food_database` - Cached nutrition data from USDA
  - `patient_preferences` - User settings and preferences

- **Row Level Security**: All tables secured with patient-only access
- **Automated Triggers**: BMI calculation, daily goal updates, audit logging
- **Helper Functions**: `get_or_create_daily_goals()`, nutrition aggregation

#### 2. **AI-Powered Edge Functions**

##### `ai_consultant_chat` (`supabase/functions/ai_consultant_chat/`)
- **Conversational Health Assistant**
- Emergency keyword detection
- Medical disclaimers on all responses
- Context-aware (uses patient history and reports)
- Gemini 2.0 Flash integration (temperature 0.7)
- Safety protocols (no diagnoses, conservative language)

##### `generate_meal_plan` (`supabase/functions/generate_meal_plan/`)
- **Personalized Meal Plans**
- Based on medical reports and health data
- Harris-Benedict BMR calculation
- Considers allergies, chronic conditions, lab results
- 7, 14, or 30-day plans
- Structured JSON output with shopping lists

##### `analyze_nutrition` (`supabase/functions/analyze_nutrition/`)
- **Food Nutrition Lookup**
- USDA FoodData Central API integration
- Local caching for performance
- Manual entry fallback
- Supports quantity and unit conversion

#### 3. **Authentication System**

##### Patient Signup (`app/auth/signup/page.tsx`)
- Split-screen Apple-inspired design
- Password strength indicator
- Form validation with real-time feedback
- Auto-creates patient record + preferences
- Email verification support

##### Login (`app/auth/login/page.tsx`)
- Universal login for patients & doctors
- Auto-routing based on user type
- Remember me functionality
- Beautiful split-screen layout

##### Forgot Password (`app/auth/forgot-password/page.tsx`)
- Email-based password reset
- Clear instructions and status messages
- Retry mechanism

#### 4. **Patient Dashboard** (`frontend/patient/Dashboard.tsx`)

##### Quick Stats Cards
- **Calories Today**: Progress ring with real-time updates
- **Water Intake**: Quick add buttons (+250ml, +500ml)
- **Current Weight**: BMI calculator with health status
- **Next Appointment**: Doctor info with quick join

##### Widgets
- **Weekly Calorie Chart**: Visual bar graph of last 7 days
- **Recent Reports**: AI-analyzed reports with priority badges
- **AI Insights**: Personalized recommendations
- **Upcoming Appointments**: Next 3 appointments
- **Floating Quick Actions**: Log meal, add weight, book appointment, chat AI

##### Features
- Responsive grid layout (4-column desktop, 2-column tablet, 1-column mobile)
- Framer Motion animations
- Real-time data from 7 database tables
- Loading states and error handling

#### 5. **Meal Tracker** (`frontend/patient/MealTracker.tsx`)

##### Core Features
- **Date Navigation**: View/edit any day's meals
- **Four Meal Sections**: Breakfast, lunch, dinner, snacks
- **Real-time Nutrition Totals**: Calories, protein, carbs, fats
- **Daily Goals Progress**: Visual progress bars
- **Add/Remove Food**: Smooth animations and optimistic updates

##### Add Food Modal (`frontend/components/patient/AddFoodModal.tsx`)
- USDA API search integration
- Manual nutrition entry fallback
- Quantity and unit selection
- Live nutrition preview
- Macro calculations

##### Data Integration
- Syncs with `daily_goals` table (auto-updates)
- Persists to `meal_logs` table
- Triggers for automatic calculations
- Optimistic UI updates

### 🚧 **Remaining Features** (Ready to Build)

1. **AI-Powered Meal Plans Viewer**
   - Display active meal plan
   - 7-day meal carousel
   - Shopping list generator
   - "Log This Meal" quick action

2. **AI Health Consultant Chat**
   - Full chat interface
   - Message history
   - Report referencing
   - Emergency detection UI

3. **Health Metrics Tracker**
   - Weight, BP, glucose tracking
   - Interactive charts (Recharts)
   - Trend analysis
   - Add metric modal

4. **Report Upload**
   - Drag-and-drop interface
   - AI analysis trigger
   - Report viewer with AI summary
   - Share with doctor

5. **Appointment Booking**
   - Doctor search by specialty
   - Calendar view
   - Time slot selection
   - Google Meet integration

6. **Settings Page**
   - Profile editing
   - Health profile (allergies, conditions)
   - Goals configuration
   - Privacy & consent management

---

## 🚀 Deployment Instructions

### 1. **Database Setup**

```bash
# Apply migrations to Supabase
cd migrations

# Run migrations in order:
# 1. 001_doctor_schema.sql (existing)
# 2. 002_policies.sql (existing)
# 3. 003_patient_features.sql (NEW)
# 4. 004_patient_policies.sql (NEW)

# In Supabase Dashboard → SQL Editor, run each file
```

### 2. **Environment Variables**

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI (for Edge Functions)
GEMINI_API_KEY=your-gemini-api-key

# USDA FoodData Central (optional, defaults to DEMO_KEY)
USDA_API_KEY=your-usda-api-key
```

### 3. **Deploy Edge Functions**

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Deploy Edge Functions
supabase functions deploy ai_consultant_chat
supabase functions deploy generate_meal_plan
supabase functions deploy analyze_nutrition

# Set secrets for Edge Functions
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
supabase secrets set USDA_API_KEY=your-usda-api-key
```

### 4. **Build and Deploy Frontend**

```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy to Vercel (or your platform)
vercel deploy --prod
```

---

## 🧪 Testing Guide

### Test Patient Signup Flow

1. Navigate to `/auth/signup`
2. Fill in patient details:
   - Full Name: "John Smith"
   - Email: "john@example.com"
   - Password: "Test123!"
   - Date of Birth: "1990-01-01"
3. Verify account creation
4. Check database for patient record

### Test Meal Tracking

1. Login as patient
2. Navigate to `/patient/meal-tracker`
3. Click "Add Food" for Breakfast
4. Search for "banana"
5. Verify nutrition data appears
6. Add to meal
7. Check daily totals update

### Test Dashboard

1. Login as patient
2. View `/patient/dashboard`
3. Verify all widgets load
4. Test water intake quick add buttons
5. Check weekly calorie chart displays

### Test Edge Functions Directly

#### AI Consultant Chat
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/ai_consultant_chat' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "What should I eat for diabetes?",
    "session_id": "test-session-123"
  }'
```

#### Generate Meal Plan
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/generate_meal_plan' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "duration_days": 7,
    "health_goals": ["diabetes_control", "heart_health"],
    "dietary_restrictions": ["vegetarian"]
  }'
```

#### Analyze Nutrition
```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/analyze_nutrition' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "food_name": "chicken breast",
    "quantity": 100,
    "unit": "g"
  }'
```

---

## 📊 Database Schema Overview

### Patient Health Tracking
```
health_metrics ─┐
                ├─► patient_id (FK to patients)
                └─► Auto-calculates BMI
```

### Meal & Nutrition
```
meal_logs ─────┐
               ├─► patient_id (FK to patients)
               └─► Triggers daily_goals update

daily_goals ───┐
               ├─► patient_id (FK to patients)
               └─► Auto-created on first meal log

food_database ─── Cached USDA nutrition data
```

### AI Features
```
ai_consultations ┐
                 ├─► patient_id (FK to patients)
                 └─► session_id (groups conversations)

meal_plans ──────┐
                 ├─► patient_id (FK to patients)
                 ├─► based_on_reports (FK to reports)
                 └─► AI-generated structured meals
```

---

## 🎨 Design System

### Colors
- **Primary Blue**: `#0A84FF`
- **Success Green**: `#32D74B`
- **Warning Orange**: `#FF9F0A`
- **Critical Red**: `#FF453A`
- **AI Purple**: `#BF5AF2`

### Typography
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Border Radius
- Small: `8px` (buttons, inputs)
- Medium: `12px` (cards)
- Large: `16px` (modals)
- XLarge: `24px` (feature sections)

### Animations
- Duration: 200ms (quick), 300ms (standard)
- Easing: `cubic-bezier(0.4, 0.0, 0.2, 1)`
- Framer Motion spring: damping 25, stiffness 300

---

## 🔒 Security Features

### Row Level Security (RLS)
- ✅ Patients can only access their own data
- ✅ Doctors can view patient data with active consent
- ✅ Service role bypasses RLS for Edge Functions
- ✅ Audit logging for all patient actions

### AI Safety
- ✅ Medical disclaimers on all AI responses
- ✅ Emergency keyword detection
- ✅ Conservative language (no definitive diagnoses)
- ✅ Source attribution for recommendations

### Input Validation
- ✅ Client-side form validation
- ✅ Server-side validation in Edge Functions
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (sanitized inputs)

---

## 📈 Performance Optimizations

### Database
- Indexes on all foreign keys
- Composite indexes for common queries
- Materialized views for analytics (future)

### Frontend
- Code splitting per page
- Image optimization
- Lazy loading for heavy components
- Optimistic UI updates

### Edge Functions
- Caching for USDA API calls
- Connection pooling
- Retry logic with exponential backoff

---

## 🐛 Troubleshooting

### Edge Functions Not Working
1. Check secrets are set: `supabase secrets list`
2. Verify GEMINI_API_KEY is valid
3. Check function logs: `supabase functions logs ai_consultant_chat`

### Database Permission Errors
1. Verify RLS policies are applied
2. Check user authentication
3. Ensure patient record exists

### Nutrition Search Fails
1. Check USDA_API_KEY (or use DEMO_KEY)
2. Verify food name spelling
3. Try manual entry as fallback

---

## 🎯 Next Steps

To complete the patient portal, build these remaining features:

1. **AI Meal Plans Viewer** - Use `generate_meal_plan` Edge Function
2. **AI Consultant Chat** - Use `ai_consultant_chat` Edge Function
3. **Health Metrics** - Charts with Recharts library
4. **Report Upload** - File upload with `reports_analyze` Edge Function
5. **Appointments** - Calendar with time slot booking
6. **Settings** - User preferences and profile editing

Each feature follows the same patterns established in the Dashboard and Meal Tracker.

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Gemini AI**: https://ai.google.dev/docs
- **USDA FoodData**: https://fdc.nal.usda.gov/api-guide.html
- **Framer Motion**: https://www.framer.com/motion/
- **Tailwind CSS**: https://tailwindcss.com/docs

---

Built with ❤️ using Next.js 14, Supabase, and Google Gemini AI
