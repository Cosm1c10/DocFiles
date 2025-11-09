'use client';

// =====================================================================
// Doctor Dashboard - Main Interface
// Description: Calendar-based appointment view with AI-powered patient insights
// Design: Apple-inspired UI with Tailwind + Framer Motion
// =====================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../lib/supabase';
import DoctorSidebar from '../components/DoctorSidebar';
import PatientRail from '../components/PatientRail';
import StartConsultModal from '../components/StartConsultModal';
import ChatDock from '../components/ChatDock';
import {
  CalendarIcon,
  BellIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// =====================================================================
// TYPES
// =====================================================================

interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_avatar?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  appointment_type: string;
  meet_link?: string;
  patient_notes?: string;
  doctor_notes?: string;
}

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

interface Notification {
  id: string;
  type: 'critical_report' | 'new_appointment' | 'message';
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'critical';
  created_at: string;
  read: boolean;
  action_url?: string;
}

// =====================================================================
// COMPONENT
// =====================================================================

export default function DoctorDashboard() {
  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // =====================================================================
  // FETCH APPOINTMENTS
  // =====================================================================
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get doctor ID
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctor) return;

      // Fetch appointments
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients:patients!inner(
            id,
            full_name,
            email,
            phone,
            date_of_birth,
            gender,
            blood_group,
            allergies,
            chronic_conditions,
            avatar_url
          )
        `)
        .eq('doctor_id', doctor.id)
        .gte('scheduled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .lte('scheduled_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data.map((apt: any) => ({
        id: apt.id,
        patient_id: apt.patients.id,
        patient_name: apt.patients.full_name,
        patient_avatar: apt.patients.avatar_url,
        scheduled_at: apt.scheduled_at,
        duration_minutes: apt.duration_minutes,
        status: apt.status,
        appointment_type: apt.appointment_type,
        meet_link: apt.meet_link,
        patient_notes: apt.patient_notes,
        doctor_notes: apt.doctor_notes,
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // =====================================================================
  // FETCH PATIENT DETAILS
  // =====================================================================
  const fetchPatientDetails = useCallback(async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      setSelectedPatient(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
    }
  }, [supabase]);

  // =====================================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================================
  useEffect(() => {
    fetchAppointments();

    // Subscribe to critical report notifications
    const notificationChannel = supabase
      .channel('doctor-notifications')
      .on('broadcast', { event: 'critical_report' }, (payload) => {
        const notification: Notification = {
          id: crypto.randomUUID(),
          type: 'critical_report',
          title: 'Critical Report Alert',
          message: `${payload.payload.patient_name}: ${payload.payload.summary}`,
          priority: 'critical',
          created_at: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [notification, ...prev]);

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Critical Report', {
            body: notification.message,
            icon: '/medical-icon.png',
            badge: '/badge.png',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [fetchAppointments, supabase]);

  // =====================================================================
  // EVENT HANDLERS
  // =====================================================================
  const handleEventClick = (info: any) => {
    const appointment = appointments.find((apt) => apt.id === info.event.id);
    if (appointment) {
      setSelectedAppointment(appointment);
      fetchPatientDetails(appointment.patient_id);
    }
  };

  const handleStartConsult = () => {
    if (selectedAppointment) {
      setShowConsultModal(true);
    }
  };

  const handleConsultComplete = async (notes: string) => {
    if (!selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'in_progress',
          doctor_notes: notes,
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      // Audit log
      await supabase.from('audit_log').insert({
        action: 'consultation_started',
        entity: 'appointments',
        entity_id: selectedAppointment.id,
        meta: { meet_link: selectedAppointment.meet_link },
      });

      setShowConsultModal(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error starting consultation:', error);
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // =====================================================================
  // CALENDAR EVENTS
  // =====================================================================
  const calendarEvents = appointments.map((apt) => ({
    id: apt.id,
    title: apt.patient_name,
    start: apt.scheduled_at,
    end: new Date(new Date(apt.scheduled_at).getTime() + apt.duration_minutes * 60000).toISOString(),
    backgroundColor: {
      scheduled: '#94A3B8',
      confirmed: '#0A84FF',
      in_progress: '#34D399',
      completed: '#9CA3AF',
      cancelled: '#EF4444',
    }[apt.status],
    borderColor: 'transparent',
    extendedProps: {
      status: apt.status,
      type: apt.appointment_type,
      patient_avatar: apt.patient_avatar,
    },
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  // =====================================================================
  // RENDER
  // =====================================================================
  return (
    <div className="flex h-screen bg-[#F6F7F8] overflow-hidden">
      {/* Sidebar */}
      <DoctorSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="w-6 h-6 text-[#0A84FF]" aria-hidden="true" />
            <h1 className="text-2xl font-semibold text-[#1C1C1E]">Today's Schedule</h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="flex items-center space-x-6 mr-6">
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                <span className="text-sm text-gray-600">
                  {appointments.filter((a) => a.status === 'confirmed').length} Today
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                <span className="text-sm text-gray-600">
                  {new Set(appointments.map((a) => a.patient_id)).size} Patients
                </span>
              </div>
            </div>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2"
              aria-label={`Notifications. ${unreadCount} unread`}
            >
              <BellIcon className="w-6 h-6 text-gray-700" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-[#FF3B30] text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-[0_6px_20px_rgba(0,0,0,0.06)] p-6">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                events={calendarEvents}
                eventClick={handleEventClick}
                height="auto"
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                nowIndicator={true}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: 'short',
                }}
                eventContent={(eventInfo) => (
                  <div className="flex items-center space-x-2 px-2 py-1 overflow-hidden">
                    {eventInfo.event.extendedProps.patient_avatar && (
                      <img
                        src={eventInfo.event.extendedProps.patient_avatar}
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-medium truncate text-white">
                        {eventInfo.event.title}
                      </div>
                      <div className="text-xs opacity-90 text-white">
                        {eventInfo.timeText}
                      </div>
                    </div>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Patient Rail */}
          {selectedPatient && selectedAppointment && (
            <PatientRail
              patient={selectedPatient}
              appointment={selectedAppointment}
              onStartConsult={handleStartConsult}
              onClose={() => {
                setSelectedPatient(null);
                setSelectedAppointment(null);
              }}
            />
          )}
        </div>

        {/* Chat Dock */}
        <ChatDock />
      </div>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1C1C1E]">Notifications</h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
                  aria-label="Close notifications"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationRead(notification.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') markNotificationRead(notification.id);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          notification.priority === 'critical'
                            ? 'bg-[#FF3B30]'
                            : notification.priority === 'urgent'
                            ? 'bg-[#FF9500]'
                            : 'bg-[#0A84FF]'
                        }`}
                        aria-label={`${notification.priority} priority`}
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-[#1C1C1E]">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Consult Modal */}
      <AnimatePresence>
        {showConsultModal && selectedAppointment && (
          <StartConsultModal
            appointment={selectedAppointment}
            onComplete={handleConsultComplete}
            onClose={() => setShowConsultModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
