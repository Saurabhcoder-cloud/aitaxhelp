'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DashboardSidebar() {
  const [activeItem, setActiveItem] = useState('overview');

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line', href: '/dashboard' },
    { id: 'file-taxes', label: 'File Taxes', icon: 'ri-file-text-line', href: '/file-taxes' },
    { id: 'calculator', label: 'Refund Calculator', icon: 'ri-calculator-line', href: '/refund-calculator' },
    { id: 'documents', label: 'Documents', icon: 'ri-folder-line', href: '#' },
    { id: 'chat', label: 'AI Assistant', icon: 'ri-chat-3-line', href: '#' },
    { id: 'reminders', label: 'Reminders', icon: 'ri-notification-line', href: '#' },
    { id: 'settings', label: 'Settings', icon: 'ri-settings-line', href: '#' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveItem(item.id)}
            className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer ${
              activeItem === item.id ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center mr-3">
              <i className={item.icon}></i>
            </div>
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}