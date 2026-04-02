import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'border-blue-600 bg-blue-50',
    green: 'border-green-600 bg-green-50',
    yellow: 'border-yellow-600 bg-yellow-50',
    red: 'border-red-600 bg-red-50',
    purple: 'border-purple-600 bg-purple-50',
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow duration-200 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
        {Icon && <Icon className={`w-8 h-8 ${iconColorClasses[color]}`} />}
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        
        {trend && (
          <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? '↑' : '↓'}
            <span className="ml-1">{trendValue}</span>
          </div>
        )}
      </div>
      
      {trend && (
        <p className="text-sm text-gray-500 mt-2">
          {trend === 'up' ? 'Increase' : 'Decrease'} from last term
        </p>
      )}
    </div>
  );
};

export default StatCard;