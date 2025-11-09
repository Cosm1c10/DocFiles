'use client';

// =====================================================================
// Doctor Sidebar Navigation
// Design: Apple-inspired collapsible sidebar
// =====================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/doctor/dashboard', icon: HomeIcon },
  { name: 'Appointments', href: '/doctor/appointments', icon: CalendarIcon },
  { name: 'Patients', href: '/doctor/patients', icon: UserGroupIcon },
  { name: 'Reports', href: '/doctor/reports', icon: DocumentTextIcon },
  { name: 'Messages', href: '/doctor/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Settings', href: '/doctor/settings', icon: Cog6ToothIcon },
];

export default function DoctorSidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white border-r border-gray-200 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-[#0A84FF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="text-lg font-semibold text-[#1C1C1E]">Health Portal</span>
          </motion.div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A84FF]"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-gray-600" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-2 px-3" aria-label="Main navigation">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}
                px-4 py-3 rounded-xl transition-all group
                ${
                  isActive
                    ? 'bg-[#0A84FF] text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-700 hover:bg-gray-100'
                }
                focus:outline-none focus:ring-2 focus:ring-[#0A84FF] focus:ring-offset-2
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#0A84FF]'}`}
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">SM</span>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-[#1C1C1E] truncate">Dr. Sarah Mitchell</p>
              <p className="text-xs text-gray-500">Cardiologist</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
