'use client';

// =====================================================================
// Meal Tracker Component
// Description: Food logging and nutrition tracking interface
// Features: Food search, meal logging, daily nutrition summary
// =====================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import PatientSidebar from '../components/patient/PatientSidebar';
import AddFoodModal from '../components/patient/AddFoodModal';
import {
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BeakerIcon,
  FireIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { Patient, MealLog, DailyGoals, FoodItem } from '../types/patient';

// =====================================================================
// COMPONENT
// =====================================================================

export default function MealTracker() {
  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealLogs, setMealLogs] = useState<{ [key: string]: MealLog }>({});
  const [dailyGoals, setDailyGoals] = useState<DailyGoals | null>(null);
  const [showAddFood, setShowAddFood] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // =====================================================================
  // FETCH DATA
  // =====================================================================
  useEffect(() => {
    fetchPatientData();
  }, []);

  useEffect(() => {
    if (patient) {
      fetchMealLogs();
    }
  }, [selectedDate, patient]);

  const fetchPatientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth/login';
        return;
      }

      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setPatient(patientData);
    } catch (error) {
      console.error('Error fetching patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMealLogs = async () => {
    if (!patient) return;

    const dateStr = selectedDate.toISOString().split('T')[0];

    // Fetch meal logs for the selected date
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('meal_date', dateStr);

    // Organize by meal type
    const logsMap: { [key: string]: MealLog } = {};
    logs?.forEach(log => {
      logsMap[log.meal_type] = log;
    });
    setMealLogs(logsMap);

    // Fetch daily goals
    const { data: goals } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('patient_id', patient.id)
      .eq('goal_date', dateStr)
      .single();

    setDailyGoals(goals);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  const handleAddFood = async (foodItem: FoodItem, mealType: string) => {
    if (!patient) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const existingLog = mealLogs[mealType];

    if (existingLog) {
      // Update existing meal log
      const newFoodItems = [...existingLog.food_items, foodItem];
      const newTotals = calculateTotals(newFoodItems);

      await supabase
        .from('meal_logs')
        .update({
          food_items: newFoodItems,
          ...newTotals,
        })
        .eq('id', existingLog.id);
    } else {
      // Create new meal log
      const newTotals = calculateTotals([foodItem]);

      await supabase
        .from('meal_logs')
        .insert({
          patient_id: patient.id,
          meal_date: dateStr,
          meal_type: mealType,
          food_items: [foodItem],
          ...newTotals,
        });
    }

    fetchMealLogs();
    setShowAddFood(false);
  };

  const handleRemoveFood = async (mealType: string, foodIndex: number) => {
    const log = mealLogs[mealType];
    if (!log) return;

    const newFoodItems = log.food_items.filter((_, index) => index !== foodIndex);

    if (newFoodItems.length === 0) {
      // Delete meal log if no items left
      await supabase
        .from('meal_logs')
        .delete()
        .eq('id', log.id);
    } else {
      // Update with remaining items
      const newTotals = calculateTotals(newFoodItems);

      await supabase
        .from('meal_logs')
        .update({
          food_items: newFoodItems,
          ...newTotals,
        })
        .eq('id', log.id);
    }

    fetchMealLogs();
  };

  const calculateTotals = (foodItems: FoodItem[]) => {
    return {
      total_calories: foodItems.reduce((sum, item) => sum + item.calories, 0),
      total_protein_g: foodItems.reduce((sum, item) => sum + item.protein, 0),
      total_carbs_g: foodItems.reduce((sum, item) => sum + item.carbs, 0),
      total_fats_g: foodItems.reduce((sum, item) => sum + item.fats, 0),
    };
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  // =====================================================================
  // CALCULATE TOTALS
  // =====================================================================
  const totalCalories = Object.values(mealLogs).reduce((sum, log) => sum + log.total_calories, 0);
  const totalProtein = Object.values(mealLogs).reduce((sum, log) => sum + log.total_protein_g, 0);
  const totalCarbs = Object.values(mealLogs).reduce((sum, log) => sum + log.total_carbs_g, 0);
  const totalFats = Object.values(mealLogs).reduce((sum, log) => sum + log.total_fats_g, 0);

  const calorieGoal = dailyGoals?.calorie_goal || 2000;
  const proteinGoal = dailyGoals?.protein_goal_g || 50;
  const caloriePercentage = Math.round((totalCalories / calorieGoal) * 100);
  const proteinPercentage = Math.round((totalProtein / proteinGoal) * 100);

  // =====================================================================
  // RENDER
  // =====================================================================
  if (loading || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading meal tracker...</p>
        </div>
      </div>
    );
  }

  const mealTypes: Array<{ type: 'breakfast' | 'lunch' | 'dinner' | 'snack', label: string, time: string, icon: string }> = [
    { type: 'breakfast', label: 'Breakfast', time: '7-10 AM', icon: '🌅' },
    { type: 'lunch', label: 'Lunch', time: '12-2 PM', icon: '☀️' },
    { type: 'dinner', label: 'Dinner', time: '6-9 PM', icon: '🌙' },
    { type: 'snack', label: 'Snacks', time: 'Anytime', icon: '🍎' },
  ];

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
                <h1 className="text-2xl font-bold text-gray-900">Meal Tracker</h1>
                <p className="text-gray-600 mt-1">Log your meals and track nutrition</p>
              </div>

              {/* Date Navigator */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeDate(-1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </button>
                <div className="text-center min-w-[180px]">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : ''}
                  </p>
                </div>
                <button
                  onClick={() => changeDate(1)}
                  disabled={selectedDate >= new Date()}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Meals */}
            <div className="xl:col-span-2 space-y-6">
              {/* Daily Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <FireIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totalCalories}</p>
                    <p className="text-xs text-gray-500">Calories</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(totalProtein)}g</p>
                    <p className="text-xs text-gray-500">Protein</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(totalCarbs)}g</p>
                    <p className="text-xs text-gray-500">Carbs</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{Math.round(totalFats)}g</p>
                    <p className="text-xs text-gray-500">Fats</p>
                  </div>
                </div>
              </div>

              {/* Meal Sections */}
              <div className="space-y-4">
                {mealTypes.map(({ type, label, time, icon }) => {
                  const log = mealLogs[type];

                  return (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-200"
                    >
                      {/* Meal Header */}
                      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{label}</h3>
                            <p className="text-xs text-gray-500">{time}</p>
                          </div>
                          {log && (
                            <span className="text-sm font-medium text-gray-600">
                              {Math.round(log.total_calories)} cal
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMealType(type);
                            setShowAddFood(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors text-sm font-medium"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Add Food
                        </button>
                      </div>

                      {/* Food Items */}
                      <div className="p-4">
                        {log && log.food_items.length > 0 ? (
                          <div className="space-y-2">
                            {log.food_items.map((food, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{food.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {food.quantity} {food.unit} • {Math.round(food.calories)} cal
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right text-xs text-gray-600">
                                    <span>P: {Math.round(food.protein)}g</span>
                                    <span className="mx-1">•</span>
                                    <span>C: {Math.round(food.carbs)}g</span>
                                    <span className="mx-1">•</span>
                                    <span>F: {Math.round(food.fats)}g</span>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveFood(type, index)}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <TrashIcon className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">No food logged yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              {/* Nutrition Goals */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Daily Goals</h2>

                {/* Calories */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Calories</span>
                    <span className="text-sm font-bold text-gray-900">
                      {totalCalories} / {calorieGoal}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          caloriePercentage > 100
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : 'bg-gradient-to-r from-orange-400 to-red-500'
                        }`}
                        style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 min-w-[40px] text-right">
                      {caloriePercentage}%
                    </span>
                  </div>
                </div>

                {/* Protein */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Protein</span>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(totalProtein)}g / {proteinGoal}g
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-500"
                        style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 min-w-[40px] text-right">
                      {proteinPercentage}%
                    </span>
                  </div>
                </div>

                {/* Macros Breakdown */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Macros Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Carbs</span>
                      <span className="font-medium text-gray-900">{Math.round(totalCarbs)}g</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Fats</span>
                      <span className="font-medium text-gray-900">{Math.round(totalFats)}g</span>
                    </div>
                  </div>
                </div>

                {/* Water Intake */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Water Intake</span>
                    <span className="text-sm font-bold text-gray-900">
                      {dailyGoals?.water_intake_ml || 0}ml
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-cyan-500"
                      style={{
                        width: `${Math.min(
                          ((dailyGoals?.water_intake_ml || 0) / (dailyGoals?.water_intake_goal_ml || 2000)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Food Modal */}
      <AddFoodModal
        isOpen={showAddFood}
        onClose={() => setShowAddFood(false)}
        onAddFood={(food) => handleAddFood(food, selectedMealType)}
        mealType={selectedMealType}
      />
    </div>
  );
}
