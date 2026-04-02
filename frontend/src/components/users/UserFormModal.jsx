// ============================================================================
// USER FORM MODAL
// Create/Edit user modal form
// ============================================================================

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiX } from 'react-icons/fi';

const UserFormModal = ({ isOpen, onClose, onSubmit, user, isLoading }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: user || {
      username: '',
      email: '',
      password: '',
      role: 'teacher',
      first_name: '',
      last_name: '',
      phone_number: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset(user);
    } else {
      reset({
        username: '',
        email: '',
        password: '',
        role: 'teacher',
        first_name: '',
        last_name: '',
        phone_number: '',
      });
    }
  }, [user, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {user ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="form-label">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                {...register('username', { 
                  required: 'Username is required',
                  minLength: { value: 3, message: 'Username must be at least 3 characters' }
                })}
                disabled={!!user}
              />
              {errors.username && (
                <p className="form-error">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="form-label">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password (only for new users) */}
            {!user && (
              <div>
                <label className="form-label">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>
            )}

            {/* Role */}
            <div>
              <label className="form-label">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                className={`form-select ${errors.role ? 'form-input-error' : ''}`}
                {...register('role', { required: 'Role is required' })}
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {errors.role && (
                <p className="form-error">{errors.role.message}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="form-label">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.first_name ? 'form-input-error' : ''}`}
                {...register('first_name', { required: 'First name is required' })}
              />
              {errors.first_name && (
                <p className="form-error">{errors.first_name.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="form-label">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.last_name ? 'form-input-error' : ''}`}
                {...register('last_name', { required: 'Last name is required' })}
              />
              {errors.last_name && (
                <p className="form-error">{errors.last_name.message}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="md:col-span-2">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="+256 700 000 000"
                {...register('phone_number')}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;