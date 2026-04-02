import React from 'react';
import { FiCalendar, FiAlertCircle } from 'react-icons/fi';

const UpcomingDeadlines = ({ deadlines }) => {
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Deadlines</h2>
        <FiCalendar className="w-5 h-5 text-gray-400" />
      </div>
      
      {deadlines && deadlines.length > 0 ? (
        <div className="space-y-3">
          {deadlines.map((deadline, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${getPriorityClass(deadline.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{deadline.title}</p>
                  <p className="text-xs mt-1 opacity-75">{deadline.description}</p>
                </div>
                {deadline.priority === 'high' && (
                  <FiAlertCircle className="w-4 h-4 ml-2 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs font-semibold">{deadline.date}</p>
                <span className="text-xs opacity-75">{deadline.daysLeft} days left</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No upcoming deadlines</p>
      )}
    </div>
  );
};

export default UpcomingDeadlines;