
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/AdminSidebar';
import AdminStats from '../../../components/AdminStats';
import AdminUserManagement from '../../../components/AdminUserManagement';
import AdminPageEditor from '../../../components/AdminPageEditor';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const adminAuth = localStorage.getItem('adminAuth');
      if (adminAuth === 'true') {
        setIsAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      router.push('/admin/login');
    }
  }, [router]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
    } catch (error) {
      console.error('Error during logout:', error);
      router.push('/admin/login');
    }
  };

  const getAdminEmail = () => {
    try {
      return localStorage.getItem('adminEmail') || 'Admin';
    } catch (error) {
      console.error('Error getting admin email:', error);
      return 'Admin';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-red-600 mb-4"></i>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <div className="flex-1 ml-64">
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === 'dashboard' && 'Admin Dashboard'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'pages' && 'Page Editor'}
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {getAdminEmail()}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-logout-box-line mr-2"></i>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <AdminStats />}
          {activeTab === 'users' && <AdminUserManagement />}
          {activeTab === 'pages' && <AdminPageEditor />}
        </div>
      </div>
    </div>
  );
}
