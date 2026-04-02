// ============================================================================
// ACADEMIC YEAR DETAIL PAGE - CONNECTED TO BACKEND
// View detailed information about an academic year
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiCalendar, 
  FiUsers, 
  FiBookOpen,
  FiClock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheckCircle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as academicYearService from '../../services/academicYearService';

const AcademicYearDetailPage = () => {
  const { id } = useParams();
  const [academicYear, setAcademicYear] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTermModal, setShowCreateTermModal] = useState(false);
  const [termFormData, setTermFormData] = useState({
    term_number: 1,
    start_date: '',
    end_date: '',
    is_current: false,
  });

  useEffect(() => {
    fetchAcademicYearDetails();
  }, [id]);

  const fetchAcademicYearDetails = async () => {
    try {
      setLoading(true);

      // Fetch academic year details
      const yearResponse = await academicYearService.getAcademicYearById(id);
      if (yearResponse.success) {
        setAcademicYear(yearResponse.data);
      }

      // Fetch statistics
      const statsResponse = await academicYearService.getAcademicYearStatistics(id);
      if (statsResponse.success) {
        setStatistics(statsResponse.data);
      }

      // Fetch terms for this academic year
      await fetchTerms();

    } catch (error) {
      toast.error('Failed to load academic year details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerms = async () => {
    try {
      // We'll create this endpoint
      const response = await fetch(`http://localhost:5000/api/terms?academic_year_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTerms(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      // Set empty array if fetch fails
      setTerms([]);
    }
  };

  const handleCreateTerm = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          ...termFormData,
          academic_year_id: id
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Term created successfully');
        setShowCreateTermModal(false);
        setTermFormData({ term_number: 1, start_date: '', end_date: '', is_current: false });
        fetchTerms();
        fetchAcademicYearDetails(); // Refresh statistics
      } else {
        toast.error(data.message || 'Failed to create term');
      }
    } catch (error) {
      toast.error('Failed to create term');
      console.error(error);
    }
  };

  const handleDeleteTerm = async (termId) => {
    if (!window.confirm('Are you sure you want to delete this term?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/terms/${termId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Term deleted successfully');
        fetchTerms();
        fetchAcademicYearDetails();
      } else {
        toast.error(data.message || 'Failed to delete term');
      }
    } catch (error) {
      toast.error('Failed to delete term');
      console.error(error);
    }
  };

  const handleSetCurrentTerm = async (termId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/terms/${termId}/set-current`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Current term updated');
        fetchTerms();
      } else {
        toast.error(data.message || 'Failed to update current term');
      }
    } catch (error) {
      toast.error('Failed to update current term');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!academicYear) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Academic year not found</p>
        <Link to="/dashboard/academic-years" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to Academic Years
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <Link
        to="/dashboard/academic-years"
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Academic Years</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{academicYear.year_name}</h1>
            <p className="text-gray-600">
              {new Date(academicYear.start_date).toLocaleDateString()} - {new Date(academicYear.end_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {academicYear.is_current && (
              <span className="badge badge-primary">Current</span>
            )}
            {academicYear.is_locked && (
              <span className="badge badge-gray">Locked</span>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="stat-card stat-card-primary">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-medium">Terms</h3>
            <FiClock className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics?.total_terms || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Academic terms</p>
        </div>

        <div className="stat-card stat-card-success">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-medium">Total Learners</h3>
            <FiUsers className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics?.total_learners || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Enrolled learners</p>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-medium">Classes</h3>
            <FiBookOpen className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics?.total_classes || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Active classes</p>
        </div>

        <div className="stat-card stat-card-danger">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-medium">Subjects</h3>
            <FiCalendar className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{statistics?.total_subjects || 0}</p>
          <p className="text-sm text-gray-500 mt-2">Curriculum subjects</p>
        </div>
      </div>

      {/* Terms Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Terms</h2>
          {!academicYear.is_locked && (
            <button
              onClick={() => setShowCreateTermModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Term</span>
            </button>
          )}
        </div>

        {terms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {terms.map((term) => (
              <div
                key={term.id}
                className={`bg-white rounded-lg border-2 p-6 ${
                  term.is_current ? 'border-blue-600' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Term {term.term_number}</h3>
                  {term.is_current && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <FiCheckCircle className="w-3 h-3 mr-1" />
                      Current
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Period</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  {term.learner_count !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500">Enrolled Learners</p>
                      <p className="text-sm font-medium text-gray-900">{term.learner_count || 0}</p>
                    </div>
                  )}
                </div>

                {!academicYear.is_locked && (
                  <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-200">
                    {!term.is_current && (
                      <button
                        onClick={() => handleSetCurrentTerm(term.id)}
                        className="flex-1 text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 transition-colors"
                      >
                        Set Current
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTerm(term.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Terms Yet</h3>
            <p className="text-gray-600 mb-6">Create terms to organize this academic year</p>
            {!academicYear.is_locked && (
              <button
                onClick={() => setShowCreateTermModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Term
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Term Modal */}
      {showCreateTermModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Term</h2>
            <form onSubmit={handleCreateTerm}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Term Number</label>
                  <select
                    value={termFormData.term_number}
                    onChange={(e) => setTermFormData({...termFormData, term_number: parseInt(e.target.value)})}
                    className="form-select"
                    required
                  >
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={termFormData.start_date}
                    onChange={(e) => setTermFormData({...termFormData, start_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={termFormData.end_date}
                    onChange={(e) => setTermFormData({...termFormData, end_date: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="term_is_current"
                    checked={termFormData.is_current}
                    onChange={(e) => setTermFormData({...termFormData, is_current: e.target.checked})}
                    className="form-checkbox"
                  />
                  <label htmlFor="term_is_current" className="ml-2 text-sm text-gray-700">
                    Set as current term
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create Term
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTermModal(false);
                    setTermFormData({ term_number: 1, start_date: '', end_date: '', is_current: false });
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

export default AcademicYearDetailPage;