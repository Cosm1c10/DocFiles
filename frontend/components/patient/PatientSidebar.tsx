'use client';

// =====================================================================
// Patient Sidebar Component
// Description: Collapsible navigation sidebar for patient portal
// Design: Apple-inspired with smooth animations
// =====================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  HeartIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  HeartIcon as HeartIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  SparklesIcon as SparklesIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

// =====================================================================
// TYPES
// =====================================================================

interface MenuItem {
  name: string;
  path: string;
  icon: any;
  iconSolid: any;
}

interface PatientSidebarProps {
  patient: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSignOut: () => void;
}

// =====================================================================
// MENU ITEMS
// =====================================================================

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/patient/dashboard', icon: HomeIcon, iconSolid: HomeIconSolid },
  { name: 'Health Metrics', path: '/patient/health-metrics', icon: HeartIcon, iconSolid: HeartIconSolid },
  { name: 'Meal Tracker', path: '/patient/meal-tracker', icon: ChartBarIcon, iconSolid: ChartBarIconSolid },
  { name: 'Meal Plans', path: '/patient/meal-plans', icon: CalendarDaysIcon, iconSolid: CalendarDaysIconSolid },
  { name: 'Reports', path: '/patient/reports', icon: DocumentTextIcon, iconSolid: DocumentTextIconSolid },
  { name: 'Appointments', path: '/patient/appointments', icon: CalendarDaysIcon, iconSolid: CalendarDaysIconSolid },
  { name: 'AI Consultant', path: '/patient/ai-consultant', icon: SparklesIcon, iconSolid: SparklesIconSolid },
  { name: 'Messages', path: '/patient/messages', icon: ChatBubbleLeftRightIcon, iconSolid: ChatBubbleLeftRightIconSolid },
  { name: 'Settings', path: '/patient/settings', icon: Cog6ToothIcon, iconSolid: Cog6ToothIconSolid },
];

// =====================================================================
// COMPONENT
// =====================================================================

export default function PatientSidebar({
  patient,
  collapsed,
  onToggleCollapse,
  onSignOut,
}: PatientSidebarProps) {
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center"
      >
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMobileMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          hidden lg:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0
          ${showMobileMenu ? 'flex' : ''}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                <span className="font-bold text-gray-900">Health Portal</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            {collapsed ? (
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            ) : (
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = isActive ? item.iconSolid : item.icon;

            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer
                    ${isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="font-medium text-sm whitespace-nowrap overflow-hidden"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Profile Section */}
        <div className="border-t border-gray-200 p-4">
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {patient.avatar_url ? (
                  <img
                    src={patient.avatar_url}
                    alt={patient.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(patient.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {patient.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {patient.email}
                  </p>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {patient.avatar_url ? (
                <img
                  src={patient.avatar_url}
                  alt={patient.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(patient.full_name)}
                </div>
              )}
              <button
                onClick={onSignOut}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col shadow-2xl"
          >
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
                <span className="font-bold text-gray-900">Health Portal</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = isActive ? item.iconSolid : item.icon;

                return (
                  <Link key={item.path} href={item.path} onClick={() => setShowMobileMenu(false)}>
                    <div
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                        ${isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Profile */}
            <div className="border-t border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {patient.avatar_url ? (
                  <img
                    src={patient.avatar_url}
                    alt={patient.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(patient.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {patient.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {patient.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  onSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
