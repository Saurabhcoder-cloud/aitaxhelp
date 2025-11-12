
'use client';

export default function AdminStats() {
  const stats = [
    {
      title: 'Total Users',
      value: '1,247',
      change: '+12%',
      icon: 'ri-user-line',
      color: 'bg-blue-500'
    },
    {
      title: 'Tax Returns Filed',
      value: '892',
      change: '+8%',
      icon: 'ri-file-text-line',
      color: 'bg-green-500'
    },
    {
      title: 'Revenue',
      value: '$18,450',
      change: '+15%',
      icon: 'ri-money-dollar-circle-line',
      color: 'bg-purple-500'
    },
    {
      title: 'Active Sessions',
      value: '156',
      change: '+5%',
      icon: 'ri-pulse-line',
      color: 'bg-orange-500'
    }
  ];

  const recentActivity = [
    { user: 'John Smith', action: 'Filed tax return', time: '2 minutes ago' },
    { user: 'Sarah Johnson', action: 'Registered new account', time: '15 minutes ago' },
    { user: 'Mike Davis', action: 'Updated profile', time: '1 hour ago' },
    { user: 'Lisa Wilson', action: 'Downloaded tax documents', time: '2 hours ago' },
    { user: 'Robert Brown', action: 'Completed payment', time: '3 hours ago' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <i className={`${stat.icon} text-white text-xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <i className="ri-user-line text-gray-600 text-sm"></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.user}</p>
                    <p className="text-xs text-gray-600">{activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <i className="ri-user-add-line text-blue-600 mr-3"></i>
                <span className="text-sm font-medium text-blue-900">Add New Admin</span>
              </div>
              <i className="ri-arrow-right-line text-blue-600"></i>
            </button>
            
            <button className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <i className="ri-file-edit-line text-green-600 mr-3"></i>
                <span className="text-sm font-medium text-green-900">Edit Website Pages</span>
              </div>
              <i className="ri-arrow-right-line text-green-600"></i>
            </button>
            
            <button className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <i className="ri-download-line text-purple-600 mr-3"></i>
                <span className="text-sm font-medium text-purple-900">Export Reports</span>
              </div>
              <i className="ri-arrow-right-line text-purple-600"></i>
            </button>
            
            <button className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <i className="ri-settings-line text-orange-600 mr-3"></i>
                <span className="text-sm font-medium text-orange-900">System Settings</span>
              </div>
              <i className="ri-arrow-right-line text-orange-600"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
