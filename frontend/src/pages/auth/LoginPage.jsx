// ============================================================================
// LOGIN PAGE
// User authentication page
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    setLoginError('');
    
    const result = await login(data);
    
    if (result.success) {
      toast.success('Login successful! Welcome back.');
      navigate('/dashboard');
    } else {
      setLoginError(result.message || 'Login failed. Please check your credentials.');
      toast.error(result.message || 'Login failed');
    }
  };

  // Quick login function for testing
  //const quickLogin = (username) => {
    //handleSubmit(onSubmit)({ username, password: 'password123' });
  //};

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-600 text-sm">
          Sign in to access your dashboard
        </p>
      </div>

      {/* Error Alert */}
      {loginError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{loginError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Username/Email Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username or Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              type="text"
              autoComplete="username"
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${
                errors.username 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter your username or email"
              {...register('username', {
                required: 'Username or email is required',
              })}
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiLock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors duration-200 ${
                errors.password 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required',
              })}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
              ) : (
                <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">
              Remember me
            </label>
          </div>

          <button
            type="button"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            onClick={() => toast('Password reset feature coming soon!')}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm hover:shadow"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <FiLogIn className="w-5 h-5" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      {/* Quick Login Buttons for Testing */}
      {/*<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-semibold text-blue-900 mb-3">
          🧪 Quick Login (Development Mode):
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => quickLogin('superadmin')}
            className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded hover:bg-blue-50 transition-colors font-medium"
            disabled={isLoading}
          >
            Login as Super Admin
          </button>
          <button
            onClick={() => quickLogin('admin')}
            className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded hover:bg-blue-50 transition-colors font-medium"
            disabled={isLoading}
          >
            Login as Admin
          </button>
          <button
            onClick={() => quickLogin('teacher1')}
            className="text-xs bg-white border border-blue-300 text-blue-700 px-3 py-2 rounded hover:bg-blue-50 transition-colors font-medium"
            disabled={isLoading}
          >
            Login as Teacher
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>All passwords:</strong> password123
          </p>
        </div>
      </div>*/}
    </div>
  );
};

export default LoginPage;