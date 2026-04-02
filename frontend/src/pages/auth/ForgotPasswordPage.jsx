import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const ForgotPasswordPage = () => {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Forgot Password</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Password reset functionality coming soon
      </p>
      
      <Link
        to="/login"
        className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
      >
        <FiArrowLeft />
        <span>Back to login</span>
      </Link>
    </div>
  );
};

export default ForgotPasswordPage;