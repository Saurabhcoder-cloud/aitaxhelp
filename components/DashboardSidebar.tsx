'use client';

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentLanguage: string;
}

export default function DashboardSidebar({ activeTab, setActiveTab, currentLanguage }: DashboardSidebarProps) {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
    { id: 'file-taxes', label: 'File Taxes', icon: 'ri-file-text-line' },
    { id: 'tax-laws', label: 'Tax Law Guidance', icon: 'ri-book-open-line' },
    { id: 'mailing-addresses', label: 'Filing Addresses', icon: 'ri-mail-send-line' },
    { id: 'documents', label: 'Documents', icon: 'ri-folder-line' },
    { id: 'chat', label: 'AI Assistant', icon: 'ri-chat-3-line' },
    { id: 'reminders', label: 'Reminders', icon: 'ri-notification-line' },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen sticky top-16">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer ${
              activeTab === item.id ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center mr-3">
              <i className={item.icon}></i>
            </div>
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}