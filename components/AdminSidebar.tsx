
'use client';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout }: AdminSidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
    { id: 'users', label: 'Manage Admins', icon: 'ri-user-settings-line' },
    { id: 'pages', label: 'Edit Pages', icon: 'ri-file-edit-line' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-3">
            <i className="ri-admin-line text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className="text-gray-400 text-sm">TaxHelp AI</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-800 transition-colors ${
              activeTab === item.id ? 'bg-red-600 border-r-4 border-red-400' : ''
            }`}
          >
            <i className={`${item.icon} mr-3 text-lg`}></i>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          <i className="ri-logout-box-line mr-3"></i>
          Logout
        </button>
      </div>
    </div>
  );
}
