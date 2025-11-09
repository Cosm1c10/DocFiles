# Test Credentials for Healthcare Portal

## 🧪 Test Accounts

### Doctor Account
- **Email**: `dr.sarah.mitchell@healthportal.demo`
- **Password**: `TestDoctor123!`
- **Role**: Doctor
- **Dashboard**: `/doctor/dashboard`

### Patient Account
- **Email**: `john.anderson@patient.demo`
- **Password**: `TestPatient123!`
- **Role**: Patient
- **Dashboard**: `/patient/dashboard`

---

## 🚀 Quick Setup Instructions

### Option 1: Create Account via Signup Page (Recommended)

1. **Go to Signup Page**: http://localhost:3000/auth/signup
2. **Fill in the form**:
   - Full Name: `John Anderson` (for patient) or `Dr. Sarah Mitchell` (for doctor)
   - Email: Use any email you want (e.g., `test@example.com`)
   - Password: `TestPassword123!`
   - Phone: `+1-555-0100`
   - Date of Birth: `1990-01-01`
   - Gender: Select any
   - Accept Terms: Check the box
3. **Click Sign Up**
4. **Login**: Use the credentials you just created at http://localhost:3000/auth/login

### Option 2: Use Test Credentials (Requires Supabase Setup)

If you have Supabase configured with the demo data:

1. **Login Page**: http://localhost:3000/auth/login
2. **Enter credentials**:
   - For Doctor: `dr.sarah.mitchell@healthportal.demo` / `TestDoctor123!`
   - For Patient: `john.anderson@patient.demo` / `TestPatient123!`

---

## 📝 Notes

- **Without Supabase**: You can still test the UI by creating accounts via the signup page, but database features won't work
- **With Supabase**: Full functionality including appointments, reports, and AI features
- **Password Requirements**: Minimum 8 characters, at least one uppercase, one lowercase, one number

---

## 🔐 Quick Test Credentials (No Setup Required)

You can create your own test account instantly:

1. Visit: http://localhost:3000/auth/signup
2. Use any email (e.g., `test@test.com`)
3. Password: `Test123456!`
4. Fill in other required fields
5. Sign up and login!

---

## 🎯 What You Can Test

### As Patient:
- ✅ View dashboard
- ✅ Track meals
- ✅ View health metrics
- ✅ Chat with AI consultant
- ✅ View appointments

### As Doctor:
- ✅ View calendar
- ✅ Manage appointments
- ✅ View patient records
- ✅ Analyze reports with AI
- ✅ Send messages

---

**⚠️ Important**: These are test credentials for development only. Never use them in production!

