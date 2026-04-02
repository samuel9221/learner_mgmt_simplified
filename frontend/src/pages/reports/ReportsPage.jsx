// ============================================================================
// REPORTS PAGE
// Generate and view learner reports
// ============================================================================

import React, { useState } from 'react';
import { FiDownload, FiPrinter, FiFileText, FiBarChart2, FiUsers, FiCalendar } from 'react-icons/fi';

const ReportsPage = () => {
  const [selectedReportType, setSelectedReportType] = useState('');

  const reportTypes = [
    {
      id: 'individual',
      name: 'Individual Learner Report',
      description: 'Generate report card for a specific learner',
      icon: FiFileText,
      color: 'blue'
    },
    {
      id: 'class',
      name: 'Class Performance Report',
      description: 'View overall performance for a class',
      icon: FiUsers,
      color: 'green'
    },
    {
      id: 'subject',
      name: 'Subject Analysis Report',
      description: 'Analyze performance by subject',
      icon: FiBarChart2,
      color: 'purple'
    },
    {
      id: 'term',
      name: 'Term Summary Report',
      description: 'Complete term overview and statistics',
      icon: FiCalendar,
      color: 'yellow'
    },
  ];

  const recentReports = [
    { id: '1', name: 'S1 East - Term 1 Report Cards', type: 'Class Report', date: '2024-03-10', status: 'Ready' },
    { id: '2', name: 'Mathematics Performance Analysis', type: 'Subject Report', date: '2024-03-08', status: 'Ready' },
    { id: '3', name: 'John Doe - Individual Report', type: 'Individual Report', date: '2024-03-05', status: 'Ready' },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-600 hover:bg-blue-100',
      green: 'bg-green-50 border-green-600 hover:bg-green-100',
      purple: 'bg-purple-50 border-purple-600 hover:bg-purple-100',
      yellow: 'bg-yellow-50 border-yellow-600 hover:bg-yellow-100',
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClass = (color) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      yellow: 'text-yellow-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and download learner reports</p>
      </div>

      {/* Report Types */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate New Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReportType(report.id)}
                className={`p-6 rounded-lg border-l-4 transition-all duration-200 text-left ${getColorClasses(report.color)}`}
              >
                <Icon className={`w-10 h-10 mb-4 ${getIconColorClass(report.color)}`} />
                <h3 className="font-bold text-gray-900 mb-2">{report.name}</h3>
                <p className="text-sm text-gray-600">{report.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Generation Form */}
      {selectedReportType && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Generate {reportTypes.find(r => r.id === selectedReportType)?.name}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select className="form-select">
                <option>2024/2025</option>
                <option>2023/2024</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select className="form-select">
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>

            {selectedReportType === 'individual' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Learner</label>
                <select className="form-select">
                  <option>John Doe - S1 East</option>
                  <option>Jane Smith - S1 East</option>
                  <option>Robert Johnson - S1 West</option>
                </select>
              </div>
            )}

            {selectedReportType === 'class' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                <select className="form-select">
                  <option>S1 East</option>
                  <option>S1 West</option>
                  <option>S2 East</option>
                  <option>S2 West</option>
                </select>
              </div>
            )}

            {selectedReportType === 'subject' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                <select className="form-select">
                  <option>Mathematics</option>
                  <option>English</option>
                  <option>Science</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <FiFileText className="w-5 h-5" />
              <span>Generate Report</span>
            </button>
            <button
              onClick={() => setSelectedReportType('')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Reports</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Date Generated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report) => (
                <tr key={report.id}>
                  <td className="font-medium text-gray-900">{report.name}</td>
                  <td>{report.type}</td>
                  <td>{new Date(report.date).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-success">{report.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors">
                        <FiPrinter className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;