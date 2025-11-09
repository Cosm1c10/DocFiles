'use client';

// =====================================================================
// Patient Rail - Right sidebar with patient details and AI summary
// =====================================================================

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import AIActionCard from './AIActionCard';
import ReportViewer from './ReportViewer';
import {
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  HeartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  allergies: string[];
  chronic_conditions: string[];
  avatar_url?: string;
}

interface Appointment {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: string;
  patient_notes?: string;
}

interface Report {
  id: string;
  title: string;
  report_date: string;
  report_type: string;
  ai_summary?: any;
  ai_tags: string[];
  file_path: string;
  created_at?: string;
}

interface Props {
  patient: Patient;
  appointment: Appointment;
  onStartConsult: () => void;
  onClose: () => void;
}

export default function PatientRail({ patient, appointment, onStartConsult, onClose }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [patient.id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null;

  return (
    <>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {patient.avatar_url ? (
                <img
                  src={patient.avatar_url}
                  alt={patient.full_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {patient.full_name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-[#1C1C1E]">{patient.full_name}</h2>
                <p className="text-sm text-gray-600">
                  {age && `${age} years`} {patient.gender && `• ${patient.gender}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
              aria-label="Close patient details"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <EnvelopeIcon className="w-4 h-4" aria-hidden="true" />
              <span>{patient.email}</span>
            </div>
            {patient.phone && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <PhoneIcon className="w-4 h-4" aria-hidden="true" />
                <span>{patient.phone}</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CalendarDaysIcon className="w-4 h-4" aria-hidden="true" />
              <span>{new Date(appointment.scheduled_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Start Consult Button */}
          {appointment.status === 'confirmed' && (
            <button
              onClick={onStartConsult}
              className="w-full mt-4 bg-[#0A84FF] text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2"
            >
              Start Consultation
            </button>
          )}
        </div>

        {/* Medical Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-[#1C1C1E] mb-3 flex items-center">
            <HeartIcon className="w-4 h-4 mr-2 text-red-500" aria-hidden="true" />
            Medical Overview
          </h3>

          <div className="space-y-3">
            {patient.blood_group && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Blood Group</p>
                <p className="text-sm font-medium text-[#1C1C1E]">{patient.blood_group}</p>
              </div>
            )}

            {patient.allergies.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1 text-orange-500" aria-hidden="true" />
                  Allergies
                </p>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-lg"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {patient.chronic_conditions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {patient.chronic_conditions.map((condition, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-lg"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1C1C1E]">Recent Reports</h3>
            <AIActionCard patientId={patient.id} onRefresh={fetchReports} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-[#0A84FF] border-t-transparent rounded-full" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No reports available
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <motion.button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-[#0A84FF] hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-[#1C1C1E] text-sm">{report.title}</h4>
                    {report.ai_summary?.priority && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          report.ai_summary.priority === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : report.ai_summary.priority === 'urgent'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {report.ai_summary.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(report.report_date || report.created_at).toLocaleDateString()} • {report.report_type}
                  </p>
                  {report.ai_summary?.summary && (
                    <p className="text-xs text-gray-700 line-clamp-2">{report.ai_summary.summary}</p>
                  )}
                  {report.ai_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {report.ai_tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Patient Notes */}
        {appointment.patient_notes && (
          <div className="p-6 border-t border-gray-200 bg-blue-50">
            <h3 className="text-xs font-semibold text-gray-600 mb-2">Patient Notes</h3>
            <p className="text-sm text-[#1C1C1E]">{appointment.patient_notes}</p>
          </div>
        )}
      </motion.div>

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </>
  );
}
