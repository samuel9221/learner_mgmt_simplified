import React from 'react';
import { FiClock, FiUser, FiFileText, FiCheckCircle } from 'react-icons/fi';

const RecentActivity = ({ activities }) => {
  const getIcon = (type) => {
    switch (type) {
      case 'assessment':
        return FiFileText;
      case 'user':
        return FiUser;
      case 'system':
        return FiCheckCircle;
      default:
        return FiClock;
    }
  };

  const getColorClass = (type) => {
    switch (type) {
      case 'assessment':
        return 'bg-blue-100 text-blue-600';
      case 'user':
        return 'bg-green-100 text-green-600';
      case 'system':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
      
      {activities && activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = getIcon(activity.type);
            return (
              <div key={index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`p-2 rounded-lg ${getColorClass(activity.type)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No recent activity</p>
      )}
    </div>
  );
};

export default RecentActivity;