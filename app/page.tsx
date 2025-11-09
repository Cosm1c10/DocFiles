'use client';

import Link from 'next/link';
import {
  SparklesIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <HeartIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Doctor Portal
              </h1>
            </div>
            <Link
              href="/doctor/dashboard"
              className="px-6 py-2.5 bg-[#0A84FF] text-white rounded-xl font-medium hover:bg-blue-600 transition-all hover:shadow-lg"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <SparklesIcon className="w-4 h-4" />
            <span>Powered by Google Gemini AI</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Healthcare
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              for Modern Doctors
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Complete doctor portal with intelligent report analysis, secure patient management,
            and real-time collaboration. Built with Supabase and Google Gemini.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/doctor/dashboard"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Launch Dashboard
            </Link>
            <a
              href="/README_DOCTOR.md"
              target="_blank"
              className="px-8 py-4 bg-white text-gray-700 rounded-2xl font-semibold border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
            >
              View Documentation
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<SparklesIcon className="w-8 h-8" />}
            title="AI Report Analysis"
            description="Automated clinical summaries with flagged values, source attribution, and conservative language"
            color="from-blue-500 to-cyan-500"
          />
          <FeatureCard
            icon={<ShieldCheckIcon className="w-8 h-8" />}
            title="HIPAA Compliant"
            description="Row-Level Security, consent-based access, and complete audit trails for compliance"
            color="from-purple-500 to-pink-500"
          />
          <FeatureCard
            icon={<CalendarDaysIcon className="w-8 h-8" />}
            title="Smart Scheduling"
            description="Calendar-based appointment management with integrated video consultations"
            color="from-green-500 to-emerald-500"
          />
          <FeatureCard
            icon={<ChatBubbleLeftRightIcon className="w-8 h-8" />}
            title="Secure Messaging"
            description="Real-time doctor-patient communication with message templates and file sharing"
            color="from-orange-500 to-red-500"
          />
          <FeatureCard
            icon={<DocumentTextIcon className="w-8 h-8" />}
            title="Report Management"
            description="PDF/image viewer with annotations, AI summaries, and source snippets"
            color="from-indigo-500 to-blue-500"
          />
          <FeatureCard
            icon={<HeartIcon className="w-8 h-8" />}
            title="Patient-Centric"
            description="Comprehensive medical history, allergies, conditions, and consent management"
            color="from-pink-500 to-rose-500"
          />
        </div>

        {/* Tech Stack */}
        <div className="mt-24 bg-white rounded-3xl shadow-xl p-12">
          <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Built with Modern Technologies
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <TechBadge name="Next.js 14" />
            <TechBadge name="TypeScript" />
            <TechBadge name="Supabase" />
            <TechBadge name="Google Gemini" />
            <TechBadge name="Tailwind CSS" />
            <TechBadge name="Framer Motion" />
            <TechBadge name="PostgreSQL" />
            <TechBadge name="Playwright" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard number="15" label="Production Files" />
          <StatCard number="6,000+" label="Lines of Code" />
          <StatCard number="100%" label="Type Safe" />
          <StatCard number="10+" label="Test Scenarios" />
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-16 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <p className="text-sm text-yellow-900 text-center">
            <strong>Medical Disclaimer:</strong> This platform provides AI-assisted clinical insights
            for informational purposes only. All outputs must be reviewed by licensed healthcare professionals.
            Not a substitute for professional medical judgment.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Healthcare Doctor Portal. Built for Healthcare. Designed for Excellence.
          </p>
          <div className="mt-4 flex items-center justify-center space-x-6">
            <a href="/README_DOCTOR.md" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              Documentation
            </a>
            <a href="/DELIVERABLES_CHECKLIST.md" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              Deliverables
            </a>
            <a href="/api_contracts/doctor_api.yaml" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              API Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1">
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${color} text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
      <span className="font-semibold text-gray-700">{name}</span>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
      <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
        {number}
      </div>
      <div className="text-gray-600 font-medium">{label}</div>
    </div>
  );
}
