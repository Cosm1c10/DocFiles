'use client';

// =====================================================================
// Start Consultation Modal - Initiate consultation with Meet link
// =====================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  VideoCameraIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  id: string;
  patient_name: string;
  meet_link?: string;
  scheduled_at: string;
  duration_minutes: number;
}

interface Props {
  appointment: Appointment;
  onComplete: (notes: string) => void;
  onClose: () => void;
}

export default function StartConsultModal({ appointment, onComplete, onClose }: Props) {
  const [notes, setNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [consultStarted, setConsultStarted] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (consultStarted) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [consultStarted]);

  const handleStart = () => {
    setConsultStarted(true);
    if (appointment.meet_link) {
      window.open(appointment.meet_link, '_blank');
    }
  };

  const handleComplete = () => {
    if (notes.trim()) {
      onComplete(notes);
    } else {
      alert('Please add consultation notes before completing');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="text-white">
            <h2 className="text-xl font-semibold">
              {consultStarted ? 'Consultation in Progress' : 'Start Consultation'}
            </h2>
            <p className="text-sm opacity-90 mt-1">
              {appointment.patient_name} • {new Date(appointment.scheduled_at).toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5 text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Timer */}
          {consultStarted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-800 font-medium">Consultation Active</span>
              </div>
              <div className="flex items-center space-x-2 text-green-800">
                <ClockIcon className="w-5 h-5" aria-hidden="true" />
                <span className="font-mono text-lg font-semibold">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          )}

          {/* Meet Link */}
          {!consultStarted && appointment.meet_link && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <VideoCameraIcon className="w-6 h-6 text-[#0A84FF]" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1C1C1E]">Video Meeting Link</p>
                  <a
                    href={appointment.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#0A84FF] hover:underline"
                  >
                    {appointment.meet_link}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Scheduled Duration</p>
              <p className="text-lg font-semibold text-[#1C1C1E]">
                {appointment.duration_minutes} minutes
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Patient</p>
              <p className="text-lg font-semibold text-[#1C1C1E] truncate">
                {appointment.patient_name}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="consult-notes" className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" aria-hidden="true" />
              Consultation Notes {consultStarted && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              id="consult-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document key findings, recommendations, prescriptions, and follow-up actions..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A84FF] resize-none"
              rows={8}
              disabled={!consultStarted}
            />
            <p className="text-xs text-gray-500 mt-2">
              {notes.length} / 5000 characters
            </p>
          </div>

          {/* Quick Templates */}
          {consultStarted && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Quick Templates:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'General Checkup', text: 'General health checkup completed. Vitals normal. No immediate concerns noted.' },
                  { label: 'Follow-up Needed', text: 'Follow-up appointment recommended in 2 weeks to monitor progress.' },
                  { label: 'Lab Tests', text: 'Ordered: CBC, Lipid Panel, HbA1c. Results expected in 3-5 business days.' },
                ].map((template) => (
                  <button
                    key={template.label}
                    onClick={() => setNotes((prev) => (prev ? prev + '\n\n' : '') + template.text)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-3">
            {!consultStarted ? (
              <button
                onClick={handleStart}
                className="px-6 py-2.5 bg-[#0A84FF] text-white rounded-xl font-medium hover:bg-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2 flex items-center space-x-2"
              >
                <VideoCameraIcon className="w-5 h-5" aria-hidden="true" />
                <span>Start Consultation</span>
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!notes.trim()}
                className={`
                  px-6 py-2.5 rounded-xl font-medium transition-all flex items-center space-x-2
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    notes.trim()
                      ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <DocumentTextIcon className="w-5 h-5" aria-hidden="true" />
                <span>Complete & Save Notes</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
