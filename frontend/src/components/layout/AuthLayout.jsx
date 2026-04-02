import React from 'react';
import { FiBook } from 'react-icons/fi';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-600 p-4 rounded-2xl shadow-lg">
              <FiBook className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            School Management System
          </h1>
          <p className="text-gray-600 text-sm">
            Uganda New Lower Secondary Curriculum (NLSC)
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Competency-Based Assessment Platform
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} School Management System</p>
          <p className="mt-1 text-xs text-gray-500">
            Designed for Ugandan Secondary Schools (S1-S4)
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;