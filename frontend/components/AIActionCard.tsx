'use client';

// =====================================================================
// AI Action Card - Trigger AI analysis on reports
// =====================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { supabase, supabaseUrl } from '../lib/supabase';

interface Props {
  patientId: string;
  reportId?: string;
  onRefresh?: () => void;
}

export default function AIActionCard({ patientId, reportId, onRefresh }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleAnalyze = async () => {
    if (!reportId) {
      setResult({ success: false, message: 'Please select a report first' });
      return;
    }

    setAnalyzing(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/reports_analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            report_id: reportId,
            force_reprocess: false,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Analysis failed');
      }

      setResult({
        success: true,
        message: data.cached
          ? 'Retrieved cached AI summary'
          : `AI analysis complete (Priority: ${data.priority})`,
      });

      if (onRefresh) {
        setTimeout(onRefresh, 500);
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Analysis failed',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleAnalyze}
        disabled={analyzing || !reportId}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all
          focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2
          ${
            analyzing || !reportId
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:scale-105'
          }
        `}
        whileHover={!analyzing && reportId ? { scale: 1.05 } : {}}
        whileTap={!analyzing && reportId ? { scale: 0.95 } : {}}
        aria-label="Analyze report with AI"
      >
        <SparklesIcon
          className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        <span className="text-sm">
          {analyzing ? 'Analyzing...' : 'AI Summarize'}
        </span>
      </motion.button>

      {/* Result Toast */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            absolute top-full mt-2 right-0 w-64 p-3 rounded-xl shadow-lg z-10
            ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
          `}
          role="alert"
        >
          <p
            className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}
          >
            {result.message}
          </p>
        </motion.div>
      )}
    </div>
  );
}
