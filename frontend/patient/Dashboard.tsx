'use client';

// =====================================================================
// Patient Dashboard - Main Interface
// Description: Comprehensive health overview with AI insights
// Design: Apple-inspired UI with widgets and quick stats
// =====================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PatientSidebar from '../components/patient/PatientSidebar';
import {
  FireIcon,
  BeakerIcon,
  ScaleIcon,
  CalendarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Patient, DailyGoals, HealthMetric, Appointment, Report } from '../types/patient';

// =====================================================================
// COMPONENT
// =====================================================================

export default function PatientDashboard() {
  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);
  const [latestMetric, setLatestMetric] = useState<HealthMetric | null>(null);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [weeklyCalories, setWeeklyCalories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // =====================================================================
  // FETCH DATA
  // =====================================================================
  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientError || !patientData) {
        console.error('Patient fetch error:', patientError);
        return;
      }

      setPatient(patientData);

      // Fetch daily goals (today)
      const today = new Date().toISOString().split('T')[0];
      const { data: goalsData } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('patient_id', patientData.id)
        .eq('goal_date', today)
        .single();

      setDailyGoals(goalsData);

      // Fetch latest health metric
      const { data: metricsData } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      setLatestMetric(metricsData);

      // Fetch next appointment
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            full_name,
            specialties,
            avatar_url
          )
        `)
        .eq('patient_id', patientData.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1);

      if (appointmentsData && appointmentsData.length > 0) {
        setNextAppointment(appointmentsData[0]);
      }

      // Fetch recent reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentReports(reportsData || []);

      // Fetch upcoming appointments
      const { data: upcomingData } = await supabase
        .from('appointments')
        .select(`
          *,
          doctors:doctor_id (
            full_name,
            specialties,
            avatar_url
          )
        `)
        .eq('patient_id', patientData.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3);

      setUpcomingAppointments(upcomingData || []);

      // Fetch weekly calorie data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: weeklyData } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('patient_id', patientData.id)
        .gte('goal_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('goal_date', { ascending: true });

      setWeeklyCalories(weeklyData || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleAddWater = async (amount: number) => {
    if (!patient || !dailyGoals) return;

    const newWaterIntake = (dailyGoals.water_intake_ml || 0) + amount;

    const { error } = await supabase
      .from('daily_goals')
      .update({ water_intake_ml: newWaterIntake })
      .eq('id', dailyGoals.id);

    if (!error) {
      setDailyGoals({ ...dailyGoals, water_intake_ml: newWaterIntake });
    }
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  if (loading || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  const caloriePercentage = dailyGoals?.calorie_goal
    ? Math.round((dailyGoals.calories_consumed / dailyGoals.calorie_goal) * 100)
    : 0;

  const waterPercentage = dailyGoals?.water_intake_goal_ml
    ? Math.round((dailyGoals.water_intake_ml / dailyGoals.water_intake_goal_ml) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <PatientSidebar
        patient={patient}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {patient.full_name.split(' ')[0]}! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  Here's your health overview for today
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Calories Today Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = '/patient/meal-tracker'}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                  <FireIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {dailyGoals?.calories_consumed || 0}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Calories Today</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
                    style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {caloriePercentage}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Goal: {dailyGoals?.calorie_goal || 2000} kcal
              </p>
            </motion.div>

            {/* Water Intake Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <BeakerIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {dailyGoals?.water_intake_ml || 0}ml
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Water Intake</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-500"
                    style={{ width: `${Math.min(waterPercentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">
                  {waterPercentage}%
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAddWater(250)}
                  className="flex-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                >
                  +250ml
                </button>
                <button
                  onClick={() => handleAddWater(500)}
                  className="flex-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                >
                  +500ml
                </button>
              </div>
            </motion.div>

            {/* Current Weight Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = '/patient/health-metrics'}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <ScaleIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {latestMetric?.weight_kg ? `${latestMetric.weight_kg}kg` : 'N/A'}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Current Weight</h3>
              {latestMetric?.bmi && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">BMI:</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {latestMetric.bmi}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    latestMetric.bmi < 18.5 ? 'bg-yellow-100 text-yellow-700' :
                    latestMetric.bmi < 25 ? 'bg-green-100 text-green-700' :
                    latestMetric.bmi < 30 ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {latestMetric.bmi < 18.5 ? 'Underweight' :
                     latestMetric.bmi < 25 ? 'Normal' :
                     latestMetric.bmi < 30 ? 'Overweight' :
                     'Obese'}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Next Appointment Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => nextAppointment && (window.location.href = '/patient/appointments')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Next Appointment</h3>
              {nextAppointment ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {nextAppointment.doctors?.full_name || 'Doctor'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(nextAppointment.scheduled_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No upcoming appointments</p>
              )}
            </motion.div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6">
              {/* Weekly Calorie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Nutrition</h2>
                <div className="h-64 flex items-end justify-between gap-2">
                  {weeklyCalories.length > 0 ? (
                    weeklyCalories.map((day, index) => {
                      const percentage = day.calorie_goal
                        ? (day.calories_consumed / day.calorie_goal) * 100
                        : 0;
                      const date = new Date(day.goal_date);
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden relative h-48">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.min(percentage, 100)}%` }}
                              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                              className={`absolute bottom-0 w-full ${
                                percentage > 100 ? 'bg-red-400' : 'bg-gradient-to-t from-blue-500 to-blue-400'
                              } rounded-t-lg`}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{dayName}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <p>No calorie data available</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Recent Reports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recent Reports</h2>
                  <button
                    onClick={() => window.location.href = '/patient/reports'}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {recentReports.length > 0 ? (
                    recentReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/patient/reports/${report.id}`}
                      >
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {report.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {report.ai_summary && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            report.ai_summary.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            report.ai_summary.priority === 'urgent' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {report.ai_summary.priority}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No reports yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* AI Insights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-sm p-6 text-white"
              >
                <div className="flex items-center gap-3 mb-4">
                  <SparklesIcon className="w-6 h-6" />
                  <h2 className="text-lg font-bold">AI Health Insights</h2>
                </div>
                <p className="text-sm text-purple-100 mb-4">
                  {dailyGoals && dailyGoals.calories_consumed > 0
                    ? `You're ${caloriePercentage}% toward your calorie goal today. ${
                        caloriePercentage < 50 ? 'Keep up the good work!' :
                        caloriePercentage < 90 ? 'Almost there!' :
                        'Goal achieved! 🎉'
                      }`
                    : 'Start logging your meals to get personalized insights!'}
                </p>
                <button
                  onClick={() => window.location.href = '/patient/ai-consultant'}
                  className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
                >
                  Chat with AI Consultant
                </button>
              </motion.div>

              {/* Upcoming Appointments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Upcoming</h2>
                  <button
                    onClick={() => window.location.href = '/patient/appointments'}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Book New
                  </button>
                </div>
                <div className="space-y-3">
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {apt.doctors?.full_name?.split(' ').map(n => n[0]).join('') || 'Dr'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {apt.doctors?.full_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(apt.scheduled_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No upcoming appointments</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Floating Quick Actions Button */}
        <div className="fixed bottom-8 right-8 z-20">
          <div className="relative">
            {showQuickActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl p-4 space-y-2 min-w-[200px]"
              >
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <FireIcon className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Log Meal</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <ScaleIcon className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Add Weight</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <CalendarIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Book Appointment</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
                  <SparklesIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700">Chat AI</span>
                </button>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-xl transition-shadow"
            >
              <PlusIcon className={`w-6 h-6 transition-transform ${showQuickActions ? 'rotate-45' : ''}`} />
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
