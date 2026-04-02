// ============================================================================
// SETTINGS PAGE
// System settings and configuration
// ============================================================================

import React, { useState } from 'react';
import { FiSave, FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    schoolName: "DeMenta Tech School",
    schoolAddress: "Kampala, Uganda",
    schoolPhone: "+256 756-727 756",
    schoolEmail: "info@menta.ug",
    currentAcademicYear: "2024/2025",
    currentTerm: "Term 1",
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* School Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">School Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">School Name</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Address</label>
                <input
                  type="text"
                  value={settings.schoolAddress}
                  onChange={(e) => setSettings({...settings, schoolAddress: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    value={settings.schoolPhone}
                    onChange={(e) => setSettings({...settings, schoolPhone: e.target.value})}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={settings.schoolEmail}
                    onChange={(e) => setSettings({...settings, schoolEmail: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Academic Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Academic Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Current Academic Year</label>
                <input
                  type="text"
                  value={settings.currentAcademicYear}
                  className="form-input"
                  disabled
                />
              </div>

              <div>
                <label className="form-label">Current Term</label>
                <input
                  type="text"
                  value={settings.currentTerm}
                  className="form-input"
                  disabled
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Academic year and term are managed in their respective sections
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiSave className="w-5 h-5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Data Management</h3>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 bg-green-100 text-green-700 px-4 py-3 rounded-lg hover:bg-green-200 transition-colors">
                <FiUpload className="w-5 h-5" />
                <span>Import Data</span>
              </button>

              <button className="w-full flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-colors">
                <FiDownload className="w-5 h-5" />
                <span>Export Data</span>
              </button>

              <button className="w-full flex items-center justify-center space-x-2 bg-yellow-100 text-yellow-700 px-4 py-3 rounded-lg hover:bg-yellow-200 transition-colors">
                <FiRefreshCw className="w-5 h-5" />
                <span>Backup Database</span>
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">System Information</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-semibold text-gray-900">1.0.0</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Database</span>
                <span className="text-sm font-semibold text-gray-900">PostgreSQL</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-600">Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;