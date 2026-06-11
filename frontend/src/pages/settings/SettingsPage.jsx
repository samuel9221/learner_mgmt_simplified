// ============================================================================
// SETTINGS PAGE
// System settings and configuration
// ============================================================================

import React, { useState, useEffect } from 'react';
import { FiSave, FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    schoolEmail: '',
    schoolMotto: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [backing, setBacking] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get('/system/config');
        if (response.data.success) {
          setSettings(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch configuration:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put('/system/config', settings);
      if (response.data.success) {
        toast.success('Settings saved successfully');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.get('/system/export', {
        responseType: 'json'
      });
      
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lms_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBacking(true);
      const response = await api.post('/system/backup', {}, {
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lms_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Database backup created successfully');
    } catch (error) {
      console.error('Failed to backup database:', error);
      toast.error('Failed to backup database');
    } finally {
      setBacking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                <label className="form-label">School Motto</label>
                <input
                  type="text"
                  value={settings.schoolMotto}
                  onChange={(e) => setSettings({...settings, schoolMotto: e.target.value})}
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

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Data Management</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-colors disabled:bg-blue-50 disabled:cursor-not-allowed"
              >
                <FiDownload className="w-5 h-5" />
                <span>{exporting ? 'Exporting...' : 'Export Data'}</span>
              </button>

              <button
                onClick={handleBackup}
                disabled={backing}
                className="w-full flex items-center justify-center space-x-2 bg-yellow-100 text-yellow-700 px-4 py-3 rounded-lg hover:bg-yellow-200 transition-colors disabled:bg-yellow-50 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className="w-5 h-5" />
                <span>{backing ? 'Backing up...' : 'Backup Database'}</span>
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