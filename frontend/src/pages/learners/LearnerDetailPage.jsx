import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiCalendar, FiBookOpen } from 'react-icons/fi';

const LearnerDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="animate-fade-in">
      <Link
        to="/dashboard/learners"
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Learners</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learner Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <FiUser className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">John Doe</h2>
              <p className="text-gray-600">S1 East</p>
            </div>

            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-semibold text-gray-900">Male</p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-semibold text-gray-900">January 15, 2010</p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <p className="text-sm text-gray-500">Enrollment Date</p>
                <p className="font-semibold text-gray-900">February 1, 2024</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Assessments */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Academic Performance</h3>
            <p className="text-gray-600">Performance data coming soon...</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Assessments</h3>
            <p className="text-gray-600">Assessment history coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnerDetailPage;