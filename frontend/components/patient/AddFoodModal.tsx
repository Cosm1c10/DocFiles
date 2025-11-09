'use client';

// ===================================================================
// Add Food Modal Component
// Description: Search and add food items with nutrition data
// Integration: USDA API via analyze_nutrition Edge Function
// =====================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  PlusIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import type { FoodItem } from '../../types/patient';

// =====================================================================
// TYPES
// =====================================================================

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFood: (food: FoodItem) => void;
  mealType: string;
}

interface NutritionData {
  food_name: string;
  brand?: string;
  serving_size: string;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number;
  sugar_g?: number;
}

// =====================================================================
// COMPONENT
// =====================================================================

export default function AddFoodModal({ isOpen, onClose, onAddFood, mealType }: AddFoodModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('serving');
  const [error, setError] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Manual entry state
  const [manualData, setManualData] = useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a food name');
      return;
    }

    setSearching(true);
    setError('');
    setNutritionData(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze_nutrition`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            food_name: searchQuery,
            quantity: 1,
            unit: 'serving',
          }),
        }
      );

      const result = await response.json();

      if (result.ok && result.found) {
        setNutritionData(result.nutrition);
        setUnit(result.nutrition.serving_unit);
      } else {
        // Food not found - show manual entry
        setShowManualEntry(true);
        setManualData({ ...manualData, name: searchQuery });
      }
    } catch (err: any) {
      console.error('Nutrition search error:', err);
      setError('Failed to search food. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = () => {
    if (nutritionData) {
      const foodItem: FoodItem = {
        name: nutritionData.food_name,
        quantity: quantity,
        unit: unit,
        calories: nutritionData.calories * quantity,
        protein: nutritionData.protein_g * quantity,
        carbs: nutritionData.carbs_g * quantity,
        fats: nutritionData.fats_g * quantity,
      };
      onAddFood(foodItem);
      handleClose();
    } else if (showManualEntry && manualData.name) {
      const foodItem: FoodItem = {
        name: manualData.name,
        quantity: quantity,
        unit: unit,
        calories: manualData.calories * quantity,
        protein: manualData.protein * quantity,
        carbs: manualData.carbs * quantity,
        fats: manualData.fats * quantity,
      };
      onAddFood(foodItem);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setNutritionData(null);
    setQuantity(1);
    setUnit('serving');
    setError('');
    setShowManualEntry(false);
    setManualData({ name: '', calories: 0, protein: 0, carbs: 0, fats: 0 });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add Food</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Search */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Food
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="e.g., chicken breast, banana, rice..."
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>

                {/* Nutrition Data or Manual Entry */}
                {nutritionData && !showManualEntry && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Food Info */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {nutritionData.food_name}
                      </h3>
                      {nutritionData.brand && (
                        <p className="text-sm text-gray-600">{nutritionData.brand}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Per {nutritionData.serving_size} {nutritionData.serving_unit}
                      </p>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                          min="0.1"
                          step="0.1"
                          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="serving">serving</option>
                          <option value="g">grams</option>
                          <option value="oz">ounces</option>
                          <option value="cup">cup</option>
                          <option value="piece">piece</option>
                        </select>
                      </div>
                    </div>

                    {/* Nutrition Facts */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Nutrition Facts</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600">Calories</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round(nutritionData.calories * quantity)}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600">Protein</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round(nutritionData.protein_g * quantity)}g
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600">Carbs</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round(nutritionData.carbs_g * quantity)}g
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-xs text-gray-600">Fats</p>
                          <p className="text-lg font-bold text-gray-900">
                            {Math.round(nutritionData.fats_g * quantity)}g
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Manual Entry */}
                {showManualEntry && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-sm text-yellow-800">
                        Food not found in database. Please enter nutrition info manually.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Food Name
                      </label>
                      <input
                        type="text"
                        value={manualData.name}
                        onChange={(e) => setManualData({ ...manualData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit
                        </label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="serving">serving</option>
                          <option value="g">grams</option>
                          <option value="piece">piece</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Calories
                        </label>
                        <input
                          type="number"
                          value={manualData.calories}
                          onChange={(e) => setManualData({ ...manualData, calories: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Protein (g)
                        </label>
                        <input
                          type="number"
                          value={manualData.protein}
                          onChange={(e) => setManualData({ ...manualData, protein: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Carbs (g)
                        </label>
                        <input
                          type="number"
                          value={manualData.carbs}
                          onChange={(e) => setManualData({ ...manualData, carbs: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fats (g)
                        </label>
                        <input
                          type="number"
                          value={manualData.fats}
                          onChange={(e) => setManualData({ ...manualData, fats: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!nutritionData && !showManualEntry}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
