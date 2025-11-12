
'use client';

import { useState } from 'react';

interface Reminder {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category: 'deadline' | 'document' | 'payment' | 'review';
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: '1',
      title: 'Tax Filing Deadline',
      description: 'File your 2024 tax return by April 15, 2025',
      dueDate: '2025-04-15',
      priority: 'high',
      completed: false,
      category: 'deadline'
    },
    {
      id: '2',
      title: 'Upload W-2 Forms',
      description: 'Upload all W-2 forms from your employers',
      dueDate: '2025-02-15',
      priority: 'medium',
      completed: true,
      category: 'document'
    },
    {
      id: '3',
      title: 'Quarterly Payment Due',
      description: 'Q1 estimated tax payment due',
      dueDate: '2025-01-15',
      priority: 'high',
      completed: false,
      category: 'payment'
    },
    {
      id: '4',
      title: 'Review Tax Return',
      description: 'Review and verify your completed tax return',
      dueDate: '2025-03-30',
      priority: 'medium',
      completed: false,
      category: 'review'
    },
    {
      id: '5',
      title: 'Gather Medical Receipts',
      description: 'Collect all medical expense receipts for deductions',
      dueDate: '2025-02-28',
      priority: 'low',
      completed: false,
      category: 'document'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    category: 'deadline' as 'deadline' | 'document' | 'payment' | 'review'
  });

  const toggleComplete = (id: string) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.id === id 
          ? { ...reminder, completed: !reminder.completed }
          : reminder
      )
    );
  };

  const addReminder = () => {
    if (newReminder.title && newReminder.dueDate) {
      const reminder: Reminder = {
        id: Date.now().toString(),
        ...newReminder,
        completed: false
      };
      setReminders(prev => [...prev, reminder]);
      setNewReminder({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        category: 'deadline'
      });
      setShowAddModal(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deadline': return 'ri-calendar-line';
      case 'document': return 'ri-file-text-line';
      case 'payment': return 'ri-money-dollar-circle-line';
      case 'review': return 'ri-eye-line';
      default: return 'ri-notification-line';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingReminders = reminders.filter(r => !r.completed && getDaysUntilDue(r.dueDate) >= 0);
  const completedReminders = reminders.filter(r => r.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tax Reminders</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Add Reminder
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Upcoming</h4>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-time-line text-blue-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{upcomingReminders.length}</p>
          <p className="text-sm text-gray-600">Active reminders</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Completed</h4>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-check-line text-green-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedReminders.length}</p>
          <p className="text-sm text-gray-600">Tasks completed</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Overdue</h4>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <i className="ri-error-warning-line text-red-600"></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {reminders.filter(r => !r.completed && getDaysUntilDue(r.dueDate) < 0).length}
          </p>
          <p className="text-sm text-gray-600">Past due date</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Active Reminders</h3>
        </div>
        <div className="divide-y">
          {upcomingReminders.map((reminder) => {
            const daysUntil = getDaysUntilDue(reminder.dueDate);
            return (
              <div key={reminder.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={() => toggleComplete(reminder.id)}
                      className="mt-1 w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors"
                    >
                      {reminder.completed && (
                        <i className="ri-check-line text-blue-600 text-sm"></i>
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <i className={`${getCategoryIcon(reminder.category)} text-blue-600`}></i>
                        </div>
                        <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(reminder.priority)}`}>
                          {reminder.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{reminder.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          <i className="ri-calendar-line mr-1"></i>
                          Due: {new Date(reminder.dueDate).toLocaleDateString()}
                        </span>
                        <span className={daysUntil < 7 ? 'text-red-600 font-medium' : ''}>
                          {daysUntil === 0 ? 'Due today' : 
                           daysUntil === 1 ? 'Due tomorrow' :
                           daysUntil > 0 ? `${daysUntil} days left` : 
                           `${Math.abs(daysUntil)} days overdue`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {completedReminders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Completed Tasks</h3>
          </div>
          <div className="divide-y">
            {completedReminders.map((reminder) => (
              <div key={reminder.id} className="p-6 opacity-60">
                <div className="flex items-center space-x-4">
                  <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center">
                    <i className="ri-check-line text-white text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-through">{reminder.title}</h4>
                    <p className="text-gray-600 text-sm">{reminder.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Reminder</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter reminder title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newReminder.description}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newReminder.dueDate}
                  onChange={(e) => setNewReminder(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newReminder.priority}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newReminder.category}
                    onChange={(e) => setNewReminder(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-8"
                  >
                    <option value="deadline">Deadline</option>
                    <option value="document">Document</option>
                    <option value="payment">Payment</option>
                    <option value="review">Review</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={addReminder}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
