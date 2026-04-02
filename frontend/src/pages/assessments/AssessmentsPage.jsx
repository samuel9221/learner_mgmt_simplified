// ============================================================================
// ASSESSMENTS PAGE
// Enter and manage learner assessments
// ============================================================================

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiCheckCircle, FiClock, FiLock } from 'react-icons/fi';
import { useAuthStore } from '../../context/authStore';

const AssessmentsPage = () => {
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('all');

  useEffect(() => {
    setTimeout(() => {
      setAssessments([
        {
          id: '1',
          subject: 'Mathematics',
          class: 'S1 East',
          term: 'Term 1',
          component: 'Classwork',
          total_learners: 45,
          assessed: 45,
          pending: 0,
          status: 'completed',
          teacher: 'James Okello',
          last_updated: '2024-03-10'
        },
        {
          id: '2',
          subject: 'English',
          class: 'S1 East',
          term: 'Term 1',
          component: 'Project',
          total_learners: 45,
          assessed: 38,
          pending: 7,
          status: 'in_progress',
          teacher: 'James Okello',
          last_updated: '2024-03-12'
        },
        {
          id: '3',
          subject: 'Science',
          class: 'S2 West',
          term: 'Term 1',
          component: 'End of Term',
          total_learners: 40,
          assessed: 0,
          pending: 40,
          status: 'pending',
          teacher: 'Grace Nambi',
          last_updated: null
        },
        {
          id: '4',
          subject: 'Mathematics',
          class: 'S1 West',
          term: 'Term 1',
          component: 'Classwork',
          total_learners: 42,
          assessed: 42,
          pending: 0,
          status: 'approved',
          teacher: 'David Ssentongo',
          last_updated: '2024-03-08'
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: 'bg-blue-100 text-blue-800', icon: FiCheckCircle, label: 'Completed' },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: FiClock, label: 'In Progress' },
      pending: { color: 'bg-gray-100 text-gray-800', icon: FiClock, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: FiCheckCircle, label: 'Approved' },
      locked: { color: 'bg-red-100 text-red-800', icon: FiLock, label: 'Locked' },
    };
    return badges[status] || badges.pending;
  };

  const filteredAssessments = selectedClass === 'all' 
    ? assessments 
    : assessments.filter(a => a.class === selectedClass);

  const classes = ['all', ...new Set(assessments.map(a => a.class))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-600 mt-1">Enter and manage learner assessments</p>
        </div>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <FiPlus className="w-5 h-5" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Filter by Class */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls === 'all' ? 'All Classes' : cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="stat-card stat-card-primary">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Assessments</h3>
          <p className="text-3xl font-bold text-gray-900">{assessments.length}</p>
        </div>
        <div className="stat-card stat-card-success">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Completed</h3>
          <p className="text-3xl font-bold text-gray-900">
            {assessments.filter(a => a.status === 'completed' || a.status === 'approved').length}
          </p>
        </div>
        <div className="stat-card stat-card-warning">
          <h3 className="text-gray-600 text-sm font-medium mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-gray-900">
            {assessments.filter(a => a.status === 'in_progress').length}
          </p>
        </div>
        <div className="stat-card stat-card-danger">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Pending</h3>
          <p className="text-3xl font-bold text-gray-900">
            {assessments.filter(a => a.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {filteredAssessments.map((assessment) => {
          const statusBadge = getStatusBadge(assessment.status);
          const StatusIcon = statusBadge.icon;
          const completionPercentage = Math.round((assessment.assessed / assessment.total_learners) * 100);

          return (
            <div key={assessment.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{assessment.subject}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{assessment.class}</span>
                    <span>•</span>
                    <span>{assessment.term}</span>
                    <span>•</span>
                    <span>{assessment.component}</span>
                    {user?.role !== 'teacher' && (
                      <>
                        <span>•</span>
                        <span>Teacher: {assessment.teacher}</span>
                      </>
                    )}
                  </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                  <FiEdit2 className="w-4 h-4" />
                  <span className="text-sm">Enter Scores</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {assessment.assessed} / {assessment.total_learners} learners ({completionPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      completionPercentage === 100 ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {assessment.last_updated ? (
                    <span>Last updated: {new Date(assessment.last_updated).toLocaleDateString()}</span>
                  ) : (
                    <span>Not started</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {assessment.pending > 0 && (
                    <span className="text-sm font-medium text-yellow-600">
                      {assessment.pending} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAssessments.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assessments Found</h3>
          <p className="text-gray-600">No assessments match your filter criteria</p>
        </div>
      )}
    </div>
  );
};

export default AssessmentsPage;