# 🖥️ Doctor Portal - Preview Guide

Welcome! This guide will help you get a **live preview** of the Doctor Portal running on your local machine.

---

## 🎯 Preview Options

### **Option 1: Local Development Preview (Recommended)**
Run the full application locally with hot-reload for development.

### **Option 2: Production Build Preview**
Build and preview the production-optimized version.

### **Option 3: Online Preview (Vercel/Netlify)**
Deploy to a preview environment for shareable links.

---

## 🚀 Option 1: Local Development Preview

### **Step 1: Install Dependencies**

```bash
cd healthcare
npm install
```

**Expected time**: 2-3 minutes

### **Step 2: Set Up Environment Variables**

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual values
nano .env.local  # or use your preferred editor
```

**Minimum required for preview (UI only):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo-key-here
NODE_ENV=development
```

> **Note**: For a **quick preview without Supabase**, you can use placeholder values. The UI will load, but dynamic features (auth, data fetching) won't work until you configure Supabase.

### **Step 3: Start Development Server**

```bash
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully in 2.5s
- wait compiling...
```

### **Step 4: Open Preview**

Open your browser and navigate to:

👉 **http://localhost:3000**

---

## 🎨 What You'll See

### **Landing Page** (`http://localhost:3000`)
- Beautiful hero section with gradient text
- 6 feature cards showcasing capabilities
- Tech stack badges
- Quick stats (15 files, 6,000+ lines)
- Medical disclaimer
- Links to Dashboard and documentation

### **Doctor Dashboard** (`http://localhost:3000/doctor/dashboard`)
- Calendar-based appointment view (FullCalendar)
- Patient rail with medical overview
- AI action cards
- Notification panel
- Real-time chat dock

> **Note**: The dashboard will show demo data if Supabase is not configured. To see real data, complete the full setup in `README_DOCTOR.md`.

---

## 🏗️ Option 2: Production Build Preview

Build and run the production-optimized version:

```bash
# Build for production
npm run build

# Start production server
npm start
```

Then visit: **http://localhost:3000**

---

## ☁️ Option 3: Online Preview (Vercel)

Deploy to Vercel for a shareable preview URL:

### **Quick Deploy**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow prompts**:
   - Link to existing project? **No**
   - Project name: `healthcare-doctor-portal`
   - Directory: `./` (press Enter)
   - Override settings? **No**

4. **Set Environment Variables** (in Vercel Dashboard):
   - Go to your project → Settings → Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

**Result**: You'll get a public URL like `https://healthcare-doctor-portal.vercel.app`

---

## 📱 Preview Features by Page

### **1. Landing Page** - `http://localhost:3000`
✅ Hero section with gradient design
✅ Feature showcase (6 cards)
✅ Tech stack display
✅ Quick stats
✅ Call-to-action buttons
✅ Medical disclaimer

### **2. Doctor Dashboard** - `http://localhost:3000/doctor/dashboard`
✅ Collapsible sidebar navigation
✅ FullCalendar with appointment cards
✅ Real-time notification panel
✅ Patient selection with animated rail
✅ Today's stats (appointments, patients)
✅ Floating chat dock

### **3. Components Showcase**
To see individual components, navigate to:
- `http://localhost:3000/doctor/dashboard` - See all components integrated

**Components you can interact with**:
- ✅ DoctorSidebar (collapsible navigation)
- ✅ PatientRail (patient details panel)
- ✅ AIActionCard (AI analysis button)
- ✅ ReportViewer (PDF/image viewer modal)
- ✅ StartConsultModal (consultation interface)
- ✅ ChatDock (floating chat)

---

## 🎬 Interactive Preview Demo

### **Quick 2-Minute UI Tour** (No Supabase Required)

1. **Visit Landing Page** - `http://localhost:3000`
   - Scroll through feature cards
   - Click "Launch Dashboard"

2. **Explore Dashboard** - `http://localhost:3000/doctor/dashboard`
   - Click sidebar items (Dashboard, Patients, Reports, etc.)
   - Toggle sidebar collapse button
   - Hover over appointment cards (if demo data exists)
   - Click notification bell icon
   - Click chat dock button (bottom-right)

3. **View Components**:
   - All components render with TypeScript type safety
   - Framer Motion animations on hover/click
   - Tailwind CSS styling with Apple design tokens

---

## ⚡ Quick Preview (No Installation)

If you just want to see the code and structure without running:

### **View Files Directly**:
```bash
# Landing page
cat app/page.tsx

# Dashboard
cat frontend/doctor/Dashboard.tsx

# Components
ls -la frontend/components/

# Database schema
cat migrations/001_doctor_schema.sql

# API docs
cat api_contracts/doctor_api.yaml
```

---

## 🔧 Troubleshooting Preview

### **Issue: Port 3000 already in use**
```bash
# Use a different port
PORT=3001 npm run dev
```
Then visit: `http://localhost:3001`

### **Issue: Module not found errors**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### **Issue: TypeScript errors**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Or ignore and run anyway
npm run dev
```

### **Issue: Tailwind styles not loading**
```bash
# Rebuild Tailwind
npx tailwindcss -i ./app/globals.css -o ./out.css --watch
```

---

## 🎨 Preview Without Full Setup

### **UI Preview Only** (No Backend Required)

To see the UI without Supabase/Gemini setup:

1. Use placeholder environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
   ```

2. The UI will render fully with:
   - ✅ All components visible
   - ✅ Animations working (Framer Motion)
   - ✅ Styling applied (Tailwind CSS)
   - ✅ Calendar rendering (FullCalendar)
   - ⚠️ Data fetching will fail gracefully
   - ⚠️ Auth won't work

**Best for**: Reviewing UI/UX, testing components, checking responsive design

---

## 📊 Preview Checklist

After starting the preview, verify:

- [ ] Landing page loads at `http://localhost:3000`
- [ ] Hero section displays with gradient text
- [ ] Feature cards render properly
- [ ] "Launch Dashboard" button works
- [ ] Dashboard loads at `/doctor/dashboard`
- [ ] Sidebar navigation is collapsible
- [ ] Calendar renders (even if empty)
- [ ] Notification bell icon visible
- [ ] Chat dock button appears (bottom-right)
- [ ] All animations smooth (Framer Motion)
- [ ] Tailwind styles applied correctly
- [ ] No console errors (except data fetching if not configured)

---

## 🌐 Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 📸 Screenshots Expected

### Landing Page:
- Clean, modern hero with gradient text
- 6 feature cards in grid layout
- Tech stack badges
- Stats cards (15 files, 6K+ lines, 100% type safe, 10+ tests)

### Dashboard:
- Left: Collapsible sidebar with navigation
- Center: FullCalendar with week/month view
- Right: Patient rail (when patient selected)
- Top: Header with stats and notification bell
- Bottom-right: Floating chat dock button

---

## 🚦 Next Steps After Preview

1. **Like what you see?** → Continue to full setup in `README_DOCTOR.md`
2. **Want to customize?** → Edit components in `frontend/components/`
3. **Deploy to production?** → See deployment section in README
4. **Run tests?** → `npm run test:e2e`

---

## 💡 Tips for Best Preview Experience

### **1. Use Chrome DevTools**
```
F12 → Toggle device toolbar (Ctrl+Shift+M)
Test responsive design on different screen sizes
```

### **2. Check Network Tab**
- See which API calls are being made
- Verify static assets loading
- Monitor bundle size

### **3. React DevTools**
Install React DevTools extension to:
- Inspect component tree
- View props and state
- Monitor re-renders

### **4. Lighthouse Audit**
```
F12 → Lighthouse → Generate report
```
Check:
- Performance score
- Accessibility score
- Best practices
- SEO

---

## 🎯 Quick Commands Reference

```bash
# Install dependencies
npm install

# Start development server (hot-reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run E2E tests
npm run test:e2e

# Deploy to Vercel
vercel

# Check Supabase status (if using local)
supabase status
```

---

## 🎉 Enjoy Your Preview!

You now have a fully functional preview of the Doctor Portal running locally!

**Preview URLs**:
- 🏠 Landing Page: `http://localhost:3000`
- 📊 Dashboard: `http://localhost:3000/doctor/dashboard`

**Next**: For full functionality with data, AI, and backend features, complete the setup in `README_DOCTOR.md`.

---

**Questions?** Check `README_DOCTOR.md` → Troubleshooting section

**Feedback?** Create an issue on GitHub

🏥 **Happy Previewing!**
