import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiUpload, FiFileText, FiUsers } from 'react-icons/fi';

const QuickActions = ({ role }) => {
  const getActions = () => {
    switch (role) {
      case 'super_admin':
        return [
          { icon: FiPlus, label: 'Create Academic Year', link: '/dashboard/academic-years', color: 'blue' },
          { icon: FiUsers, label: 'Manage Users', link: '/dashboard/users', color: 'green' },
          { icon: FiFileText, label: 'View Reports', link: '/dashboard/reports', color: 'purple' },
          { icon: FiUpload, label: 'Import Data', link: '/dashboard/settings', color: 'yellow' },
        ];
      
      case 'admin':
        return [
          { icon: FiPlus, label: 'Add Learner', link: '/dashboard/learners', color: 'blue' },
          { icon: FiUsers, label: 'Manage Classes', link: '/dashboard/classes', color: 'green' },
          { icon: FiFileText, label: 'View Reports', link: '/dashboard/reports', color: 'purple' },
          { icon: FiUpload, label: 'Import Learners', link: '/dashboard/learners', color: 'yellow' },
        ];
      
      case 'teacher':
        return [
          { icon: FiPlus, label: 'Enter Assessment', link: '/dashboard/assessments', color: 'blue' },
          { icon: FiUsers, label: 'My Classes', link: '/dashboard/classes', color: 'green' },
          { icon: FiFileText, label: 'Generate Reports', link: '/dashboard/reports', color: 'purple' },
          { icon: FiFileText, label: 'View Learners', link: '/dashboard/learners', color: 'yellow' },
        ];
      
      default:
        return [];
    }
  };

  const actions = getActions();

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.link}
            className={`flex items-center space-x-3 p-4 rounded-lg text-white transition-all duration-200 ${colorClasses[action.color]}`}
          >
            <action.icon className="w-5 h-5" />
            <span className="font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;