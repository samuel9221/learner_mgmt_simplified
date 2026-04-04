// ============================================================================
// SUBJECT COMBINATIONS PAGE
// Manage S5/S6 subject combinations
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiBook, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as subjectCombinationService from '../../services/subjectCombinationService';
import * as subjectService from '../../services/subjectService';

const SubjectCombinationsPage = () => {
  const [combinations, setCombinations] = useState([]);
  const [principalSubjects, setPrincipalSubjects] = useState([]);
  const [subsidiarySubjects, setSubsidiarySubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState(null);
  
  const [formData, setFormData] = useState({
    combination_name: '',
    combination_code: '',
    description: '',
    principal_1: '',
    principal_2: '',
    principal_3: '',
    subsidiary: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch combinations
      const combinationsResponse = await subjectCombinationService.getCombinations();
      if (combinationsResponse.success) {
        setCombinations(combinationsResponse.data);
      }

      // Fetch principal subjects (S5/S6, non-subsidiary)
      const principalsResponse = await subjectService.getSubjects();
      if (principalsResponse.success) {
        const principals = principalsResponse.data.filter(
          s => !s.is_subsidiary && 
               s.applicable_levels && 
               (s.applicable_levels.includes('S5') || s.applicable_levels.includes('S6'))
        );
        setPrincipalSubjects(principals);
      }

      // Fetch subsidiary subjects (excluding GP which is auto-added)
      const subsidiariesResponse = await subjectService.getSubsidiarySubjects();
      if (subsidiariesResponse.success) {
        const nonGPSubsidiaries = subsidiariesResponse.data.filter(
          s => s.subject_code !== 'GP'
        );
        setSubsidiarySubjects(nonGPSubsidiaries);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.principal_1 || !formData.principal_2 || !formData.principal_3) {
      toast.error('Please select all 3 principal subjects');
      return;
    }

    if (!formData.subsidiary) {
      toast.error('Please select a subsidiary subject');
      return;
    }

    // Check for duplicate principals
    const principals = [formData.principal_1, formData.principal_2, formData.principal_3];
    if (new Set(principals).size !== 3) {
      toast.error('Principal subjects must be unique');
      return;
    }

    try {
      // Find GP subject
      const allSubjects = await subjectService.getSubsidiarySubjects();
      const gpSubject = allSubjects.data.find(s => s.subject_code === 'GP');

      if (!gpSubject) {
        toast.error('General Paper subject not found. Please create it first.');
        return;
      }

      // Prepare subject_ids array: 3 principals + 1 subsidiary + GP
      const subject_ids = [
        formData.principal_1,
        formData.principal_2,
        formData.principal_3,
        formData.subsidiary,
        gpSubject.id, // Auto-add GP
      ];

      const response = await subjectCombinationService.createCombination({
        combination_name: formData.combination_name,
        combination_code: formData.combination_code,
        description: formData.description,
        subject_ids,
      });

      if (response.success) {
        toast.success('Combination created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create combination';
      toast.error(message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.principal_1 || !formData.principal_2 || !formData.principal_3) {
      toast.error('Please select all 3 principal subjects');
      return;
    }

    if (!formData.subsidiary) {
      toast.error('Please select a subsidiary subject');
      return;
    }

    // Check for duplicate principals
    const principals = [formData.principal_1, formData.principal_2, formData.principal_3];
    if (new Set(principals).size !== 3) {
      toast.error('Principal subjects must be unique');
      return;
    }

    try {
      // Find GP subject
      const allSubjects = await subjectService.getSubsidiarySubjects();
      const gpSubject = allSubjects.data.find(s => s.subject_code === 'GP');

      if (!gpSubject) {
        toast.error('General Paper subject not found');
        return;
      }

      // Prepare subject_ids array
      const subject_ids = [
        formData.principal_1,
        formData.principal_2,
        formData.principal_3,
        formData.subsidiary,
        gpSubject.id,
      ];

      const response = await subjectCombinationService.updateCombination(selectedCombination.id, {
        combination_name: formData.combination_name,
        combination_code: formData.combination_code,
        description: formData.description,
        subject_ids,
      });

      if (response.success) {
        toast.success('Combination updated successfully');
        setShowEditModal(false);
        setSelectedCombination(null);
        resetForm();
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update combination';
      toast.error(message);
    }
  };

  const handleToggleActive = async (combination) => {
    try {
      const response = await subjectCombinationService.toggleCombinationActive(combination.id);
      if (response.success) {
        toast.success(`Combination ${response.data.is_active ? 'activated' : 'deactivated'}`);
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to toggle combination';
      toast.error(message);
    }
  };

  const handleDelete = async (combination) => {
    if (!window.confirm(`Are you sure you want to delete "${combination.combination_name}"?`)) {
      return;
    }

    try {
      const response = await subjectCombinationService.deleteCombination(combination.id);
      if (response.success) {
        toast.success('Combination deleted successfully');
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete combination';
      toast.error(message);
    }
  };

  const openEditModal = (combination) => {
    setSelectedCombination(combination);
    
    // Extract principals and subsidiary from combination.subjects
    const principals = combination.subjects.filter(s => !s.is_subsidiary && s.subject_code !== 'GP');
    const subsidiary = combination.subjects.find(s => s.is_subsidiary && s.subject_code !== 'GP');

    setFormData({
      combination_name: combination.combination_name,
      combination_code: combination.combination_code,
      description: combination.description || '',
      principal_1: principals[0]?.id || '',
      principal_2: principals[1]?.id || '',
      principal_3: principals[2]?.id || '',
      subsidiary: subsidiary?.id || '',
    });
    
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      combination_name: '',
      combination_code: '',
      description: '',
      principal_1: '',
      principal_2: '',
      principal_3: '',
      subsidiary: '',
    });
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
      {/* Back Button */}
      <Link
        to="/dashboard/subjects"
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Subjects</span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subject Combinations</h1>
          <p className="text-gray-600 mt-1">Manage S5/S6 subject combinations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Create Combination</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-purple-900 mb-2">How Combinations Work:</h3>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Each combination has <strong>3 Principal subjects</strong></li>
          <li>• Plus <strong>1 Subsidiary subject</strong> (chosen from ICT or Sub Math)</li>
          <li>• <strong>General Paper</strong> is automatically added to all combinations</li>
          <li>• Total: <strong>5 subjects per combination</strong></li>
        </ul>
      </div>

      {/* Combinations Grid */}
      {combinations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combinations.map((combination) => {
            const principals = combination.subjects.filter(s => !s.is_subsidiary);
            const subsidiaries = combination.subjects.filter(s => s.is_subsidiary);
            
            return (
              <div
                key={combination.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  combination.is_active ? 'border-green-500' : 'border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                        {combination.combination_code}
                      </span>
                      {combination.is_active ? (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{combination.combination_name}</h2>
                    {combination.description && (
                      <p className="text-sm text-gray-600 mt-1">{combination.description}</p>
                    )}
                  </div>
                </div>

                {/* Principal Subjects */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Principal Subjects:</h3>
                  <div className="space-y-1">
                    {principals.map((subject, index) => (
                      <div key={subject.id} className="flex items-center text-sm text-gray-700">
                        <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-xs font-bold mr-2">
                          {index + 1}
                        </span>
                        {subject.subject_name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subsidiaries */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Subsidiaries:</h3>
                  <div className="space-y-1">
                    {subsidiaries.map((subject) => (
                      <div key={subject.id} className="flex items-center text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          subject.subject_code === 'GP' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {subject.subject_code === 'GP' ? 'Auto' : 'Chosen'}
                        </span>
                        <span className="ml-2 text-gray-700">{subject.subject_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleToggleActive(combination)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                  >
                    {combination.is_active ? (
                      <>
                        <FiToggleRight className="w-4 h-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-4 h-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openEditModal(combination)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(combination)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Combinations Yet</h3>
          <p className="text-gray-600 mb-6">
            Create subject combinations for S5 and S6 students
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Combination
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Subject Combination</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Combination Name *</label>
                    <input
                      type="text"
                      value={formData.combination_name}
                      onChange={(e) => setFormData({...formData, combination_name: e.target.value})}
                      className="form-input"
                      placeholder="e.g., Science Combination"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Combination Code *</label>
                    <input
                      type="text"
                      value={formData.combination_code}
                      onChange={(e) => setFormData({...formData, combination_code: e.target.value.toUpperCase()})}
                      className="form-input"
                      placeholder="e.g., PCM"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                    rows="2"
                    placeholder="Brief description of this combination"
                  />
                </div>

                {/* Principal Subjects */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Principal Subjects (Select 3)</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="form-label">Principal Subject 1 *</label>
                      <select
                        value={formData.principal_1}
                        onChange={(e) => setFormData({...formData, principal_1: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_2 || subject.id === formData.principal_3}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Principal Subject 2 *</label>
                      <select
                        value={formData.principal_2}
                        onChange={(e) => setFormData({...formData, principal_2: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_1 || subject.id === formData.principal_3}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Principal Subject 3 *</label>
                      <select
                        value={formData.principal_3}
                        onChange={(e) => setFormData({...formData, principal_3: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_1 || subject.id === formData.principal_2}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subsidiary Subject */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Subsidiary Subject (Select 1)</h3>
                  <div>
                    <label className="form-label">Choose Subsidiary *</label>
                    <select
                      value={formData.subsidiary}
                      onChange={(e) => setFormData({...formData, subsidiary: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Subsidiary --</option>
                      {subsidiarySubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_code} - {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* General Paper - Auto Included */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">General Paper (Auto-Included)</h3>
                  <p className="text-sm text-gray-700">
                    ✓ General Paper is automatically added to all S5/S6 combinations
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Combination
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
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

      {/* Edit Modal - Similar structure to Create Modal */}
      {showEditModal && selectedCombination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Subject Combination</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Combination Name *</label>
                    <input
                      type="text"
                      value={formData.combination_name}
                      onChange={(e) => setFormData({...formData, combination_name: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Combination Code *</label>
                    <input
                      type="text"
                      value={formData.combination_code}
                      onChange={(e) => setFormData({...formData, combination_code: e.target.value.toUpperCase()})}
                      className="form-input"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                    rows="2"
                  />
                </div>

                {/* Principal Subjects */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Principal Subjects (Select 3)</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="form-label">Principal Subject 1 *</label>
                      <select
                        value={formData.principal_1}
                        onChange={(e) => setFormData({...formData, principal_1: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_2 || subject.id === formData.principal_3}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Principal Subject 2 *</label>
                      <select
                        value={formData.principal_2}
                        onChange={(e) => setFormData({...formData, principal_2: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_1 || subject.id === formData.principal_3}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Principal Subject 3 *</label>
                      <select
                        value={formData.principal_3}
                        onChange={(e) => setFormData({...formData, principal_3: e.target.value})}
                        className="form-select"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {principalSubjects.map((subject) => (
                          <option 
                            key={subject.id} 
                            value={subject.id}
                            disabled={subject.id === formData.principal_1 || subject.id === formData.principal_2}
                          >
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Subsidiary Subject */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Subsidiary Subject (Select 1)</h3>
                  <div>
                    <label className="form-label">Choose Subsidiary *</label>
                    <select
                      value={formData.subsidiary}
                      onChange={(e) => setFormData({...formData, subsidiary: e.target.value})}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Subsidiary --</option>
                      {subsidiarySubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_code} - {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* General Paper */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">General Paper (Auto-Included)</h3>
                  <p className="text-sm text-gray-700">
                    ✓ General Paper is automatically added to all S5/S6 combinations
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Combination
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCombination(null);
                    resetForm();
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

export default SubjectCombinationsPage;