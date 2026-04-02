// ============================================================================
// ACADEMIC YEARS PAGE - CONNECTED TO BACKEND
// List and manage academic years (Super Admin only)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiPlus, 
  FiEdit2, 
  FiLock, 
  FiUnlock, 
  FiCheckCircle,
  FiCalendar,
  FiAlertCircle,
  FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as academicYearService from '../../services/academicYearService';

const AcademicYearsPage = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [formData, setFormData] = useState({
    year_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await academicYearService.getAcademicYears();
      if (response.success) {
        setAcademicYears(response.data);
      }
    } catch (error) {
      toast.error('Failed to load academic years');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await academicYearService.createAcademicYear(formData);
      if (response.success) {
        toast.success('Academic year created successfully');
        setShowCreateModal(false);
        setFormData({ year_name: '', start_date: '', end_date: '', is_current: false });
        fetchAcademicYears();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create academic year';
      toast.error(message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await academicYearService.updateAcademicYear(selectedYear.id, formData);
      if (response.success) {
        toast.success('Academic year updated successfully');
        setShowEditModal(false);
        setSelectedYear(null);
        fetchAcademicYears();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update academic year';
      toast.error(message);
    }
  };

  const handleLockToggle = async (year) => {
    try {
      if (year.is_locked) {
        await academicYearService.unlockAcademicYear(year.id);
        toast.success('Academic year unlocked successfully');
      } else {
        await academicYearService.lockAcademicYear(year.id);
        toast.success('Academic year locked successfully');
      }
      fetchAcademicYears();
    } catch (error) {
      const message = error.response?.data?.message || 'Operation failed';
      toast.error(message);
    }
  };

  const handleSetCurrent = async (yearId) => {
    try {
      const response = await academicYearService.setCurrentAcademicYear(yearId);
      if (response.success) {
        toast.success('Current academic year updated');
        fetchAcademicYears();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to set current year';
      toast.error(message);
    }
  };

  const handleDelete = async (year) => {
    if (!window.confirm(`Are you sure you want to delete ${year.year_name}?`)) {
      return;
    }

    try {
      const response = await academicYearService.deleteAcademicYear(year.id);
      if (response.success) {
        toast.success('Academic year deleted successfully');
        fetchAcademicYears();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete academic year';
      toast.error(message);
    }
  };

  const openEditModal = (year) => {
    setSelectedYear(year);
    setFormData({
      year_name: year.year_name,
      start_date: year.start_date.split('T')[0],
      end_date: year.end_date.split('T')[0],
      is_current: year.is_current,
    });
    setShowEditModal(true);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Years</h1>
          <p className="text-gray-600 mt-1">Manage academic years and terms</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <FiPlus className="w-5 h-5" />
          <span>Create Academic Year</span>
        </button>
      </div>

      {/* Academic Years List */}
      <div className="grid grid-cols-1 gap-6">
        {academicYears.map((year) => (
          <div
            key={year.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              year.is_current ? 'border-blue-600' : 'border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              {/* Left Section */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">{year.year_name}</h2>
                  {year.is_current && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <FiCheckCircle className="w-3 h-3 mr-1" />
                      Current
                    </span>
                  )}
                  {year.is_locked && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <FiLock className="w-3 h-3 mr-1" />
                      Locked
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Terms</p>
                    <p className="text-lg font-semibold text-gray-900">{year.term_count || 0} Terms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Learners</p>
                    <p className="text-lg font-semibold text-gray-900">{year.learner_count || 0}</p>
                  </div>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex flex-col space-y-2 ml-6">
                <Link
                  to={`/dashboard/academic-years/${year.id}`}
                  className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <FiCalendar className="w-4 h-4" />
                  <span>View Details</span>
                </Link>

                {!year.is_locked && (
                  <button
                    onClick={() => openEditModal(year)}
                    className="flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <FiEdit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}

                {!year.is_current && !year.is_locked && (
                  <button
                    onClick={() => handleSetCurrent(year.id)}
                    className="flex items-center justify-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    <span>Set as Current</span>
                  </button>
                )}

                <button
                  onClick={() => handleLockToggle(year)}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                    year.is_locked
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={year.is_current}
                >
                  {year.is_locked ? (
                    <>
                      <FiUnlock className="w-4 h-4" />
                      <span>Unlock</span>
                    </>
                  ) : (
                    <>
                      <FiLock className="w-4 h-4" />
                      <span>Lock</span>
                    </>
                  )}
                </button>

                {!year.is_current && !year.is_locked && (
                  <button
                    onClick={() => handleDelete(year)}
                    className="flex items-center justify-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {academicYears.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Academic Years</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first academic year</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Academic Year
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Academic Year</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Year Name</label>
                  <input
                    type="text"
                    value={formData.year_name}
                    onChange={(e) => setFormData({...formData, year_name: e.target.value})}
                    className="form-input"
                    placeholder="e.g., 2025/2026"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_current"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({...formData, is_current: e.target.checked})}
                    className="form-checkbox"
                  />
                  <label htmlFor="is_current" className="ml-2 text-sm text-gray-700">
                    Set as current academic year
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ year_name: '', start_date: '', end_date: '', is_current: false });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedYear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Academic Year</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Year Name</label>
                  <input
                    type="text"
                    value={formData.year_name}
                    onChange={(e) => setFormData({...formData, year_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedYear(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearsPage;