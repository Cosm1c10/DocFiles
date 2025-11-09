'use client';

// =====================================================================
// Report Viewer - PDF/Image viewer with AI summary and annotations
// =====================================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Report {
  id: string;
  title: string;
  file_path: string;
  file_mime: string;
  ai_summary?: {
    summary: string;
    priority: 'normal' | 'urgent' | 'critical';
    flags: Array<{
      label: string;
      value: string;
      reason: string;
      source_snippet: string;
    }>;
    questions: string[];
    recommended_tests: string[];
  };
  annotations?: any[];
}

interface Props {
  report: Report;
  onClose: () => void;
}

export default function ReportViewer({ report, onClose }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'ai-summary' | 'annotations'>('preview');
  const [annotationText, setAnnotationText] = useState('');

  useEffect(() => {
    fetchSignedUrl();
  }, [report.id]);

  const fetchSignedUrl = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.file_path, 3600);

      if (error) throw error;
      setSignedUrl(data.signedUrl);
    } catch (error) {
      console.error('Error fetching signed URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  const saveAnnotation = async () => {
    if (!annotationText.trim()) return;

    try {
      const newAnnotation = {
        id: crypto.randomUUID(),
        text: annotationText,
        created_at: new Date().toISOString(),
        type: 'note',
      };

      const currentAnnotations = report.annotations || [];
      const { error } = await supabase
        .from('reports')
        .update({
          annotations: [...currentAnnotations, newAnnotation],
        })
        .eq('id', report.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        action: 'annotation_added',
        entity: 'reports',
        entity_id: report.id,
        meta: { annotation_text: annotationText },
      });

      setAnnotationText('');
      alert('Annotation saved successfully');
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Failed to save annotation');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-[#1C1C1E]">{report.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{report.file_mime}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                aria-label="Download report"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                aria-label="Close viewer"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {[
              { id: 'preview', label: 'Preview' },
              { id: 'ai-summary', label: 'AI Summary' },
              { id: 'annotations', label: 'Annotations' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2
                  ${
                    activeTab === tab.id
                      ? 'border-[#0A84FF] text-[#0A84FF]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'preview' && (
              <div className="h-full">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-[#0A84FF] border-t-transparent rounded-full" />
                  </div>
                ) : signedUrl ? (
                  report.file_mime === 'application/pdf' ? (
                    <iframe
                      src={signedUrl}
                      className="w-full h-full rounded-xl border border-gray-200"
                      title={report.title}
                    />
                  ) : report.file_mime.startsWith('image/') ? (
                    <img
                      src={signedUrl}
                      alt={report.title}
                      className="max-w-full h-auto rounded-xl border border-gray-200 mx-auto"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>Preview not available for this file type</p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-red-500">
                    <p>Failed to load file</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai-summary' && report.ai_summary && (
              <div className="space-y-6">
                {/* Priority Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`
                      px-4 py-2 rounded-xl font-medium text-sm
                      ${
                        report.ai_summary.priority === 'critical'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : report.ai_summary.priority === 'urgent'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-green-100 text-green-800 border border-green-200'
                      }
                    `}
                  >
                    Priority: {report.ai_summary.priority.toUpperCase()}
                  </span>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-[#1C1C1E] mb-2">Clinical Summary</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{report.ai_summary.summary}</p>
                </div>

                {/* Flags */}
                {report.ai_summary.flags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#1C1C1E] mb-3 flex items-center">
                      <ExclamationCircleIcon className="w-5 h-5 mr-2 text-orange-500" aria-hidden="true" />
                      Flagged Values ({report.ai_summary.flags.length})
                    </h3>
                    <div className="space-y-3">
                      {report.ai_summary.flags.map((flag, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-[#1C1C1E]">{flag.label}</h4>
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                              {flag.value}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{flag.reason}</p>
                          <div className="bg-gray-50 border-l-4 border-[#0A84FF] pl-3 py-2 text-xs text-gray-600 font-mono">
                            "{flag.source_snippet}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions */}
                {report.ai_summary.questions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#1C1C1E] mb-3">Suggested Questions for Patient</h3>
                    <ul className="space-y-2">
                      {report.ai_summary.questions.map((question, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-[#0A84FF] font-bold">{idx + 1}.</span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Tests */}
                {report.ai_summary.recommended_tests.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-[#1C1C1E] mb-3 flex items-center">
                      <CheckCircleIcon className="w-5 h-5 mr-2 text-green-500" aria-hidden="true" />
                      Recommended Follow-up Tests
                    </h3>
                    <ul className="space-y-2">
                      {report.ai_summary.recommended_tests.map((test, idx) => (
                        <li key={idx} className="flex items-center space-x-2 text-sm text-gray-700">
                          <div className="w-2 h-2 bg-[#0A84FF] rounded-full" />
                          <span>{test}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs text-yellow-900 leading-relaxed">
                    <strong>Disclaimer:</strong> This AI-generated summary is for informational purposes only
                    and does not constitute medical advice. All flagged values and recommendations should be
                    reviewed by a licensed physician in the context of the patient's complete medical history
                    and current condition. Consult your medical judgment before making any clinical decisions.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'ai-summary' && !report.ai_summary && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No AI summary available. Click "AI Summarize" to generate one.</p>
              </div>
            )}

            {activeTab === 'annotations' && (
              <div className="space-y-4">
                {/* Add Annotation */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <label htmlFor="annotation-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Add Annotation
                  </label>
                  <textarea
                    id="annotation-input"
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    placeholder="Type your clinical notes or observations..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A84FF] resize-none"
                    rows={4}
                  />
                  <button
                    onClick={saveAnnotation}
                    disabled={!annotationText.trim()}
                    className={`
                      mt-3 px-4 py-2 rounded-xl font-medium transition-all
                      focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2
                      ${
                        annotationText.trim()
                          ? 'bg-[#0A84FF] text-white hover:bg-blue-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 inline mr-2" aria-hidden="true" />
                    Save Annotation
                  </button>
                </div>

                {/* Existing Annotations */}
                {report.annotations && report.annotations.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-[#1C1C1E]">Previous Annotations</h3>
                    {report.annotations.map((annotation: any) => (
                      <div key={annotation.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <p className="text-sm text-gray-700">{annotation.text}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(annotation.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No annotations yet</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
