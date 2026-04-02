import React, { useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { FiUser, FiMail, FiPhone, FiShield, FiEdit2, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
  });

  const handleSave = () => {
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl font-bold text-blue-700">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-gray-600 text-sm capitalize mb-4">
              {user?.role?.replace('_', ' ')}
            </p>
            <span className="badge badge-success">Active</span>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <FiEdit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="form-input"
                  />
                ) : (
                  <p className="text-gray-900 font-medium py-2">{user?.first_name}</p>
                )}
              </div>

              <div>
                <label className="form-label">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="form-input"
                  />
                ) : (
                  <p className="text-gray-900 font-medium py-2">{user?.last_name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="form-input"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{user?.email}</p>
              )}
            </div>

            <div>
              <label className="form-label">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="form-input"
                  placeholder="+256 700 000 000"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{user?.phone_number || 'Not provided'}</p>
              )}
            </div>

            <div>
              <label className="form-label">Username</label>
              <p className="text-gray-900 font-medium py-2">{user?.username}</p>
            </div>

            <div>
              <label className="form-label">Role</label>
              <p className="text-gray-900 font-medium py-2 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
        <button className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors">
          Change Password
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;