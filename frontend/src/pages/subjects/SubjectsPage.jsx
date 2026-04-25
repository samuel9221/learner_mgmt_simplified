// ============================================================================
// SUBJECTS PAGE - CONNECTED TO BACKEND
// Manage curriculum subjects
// ============================================================================

import React, { useState, useEffect } from 'react';
import { FiPlus, FiBook, FiUsers, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as subjectService from '../../services/subjectService';
import { Link } from 'react-router-dom';  // Add this import

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    description: '',
    is_compulsory: false,
    //is_optional: false,
    is_subsidiary: false,
    applicable_levels: ["S1", "S2", "S3", "S4"],
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await subjectService.getSubjects({ search: searchTerm });
      if (response.success) {
        setSubjects(response.data);
      }
    } catch (error) {
      toast.error('Failed to load subjects');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await subjectService.createSubject(formData);
      if (response.success) {
        toast.success('Subject created successfully');
        setShowCreateModal(false);
        setFormData({ subject_code: '', subject_name: '', description: '' });
        fetchSubjects();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create subject';
      toast.error(message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await subjectService.updateSubject(selectedSubject.id, formData);
      if (response.success) {
        toast.success('Subject updated successfully');
        setShowEditModal(false);
        setSelectedSubject(null);
        fetchSubjects();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update subject';
      toast.error(message);
    }
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Are you sure you want to delete ${subject.subject_name}?`)) {
      return;
    }

    try {
      const response = await subjectService.deleteSubject(subject.id);
      if (response.success) {
        toast.success('Subject deleted successfully');
        fetchSubjects();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete subject';
      toast.error(message);
    }
  };

  const openEditModal = (subject) => {
  setSelectedSubject(subject);
  setFormData({
    subject_code: subject.subject_code,
    subject_name: subject.subject_name,
    description: subject.description || '',
    is_compulsory: subject.is_compulsory || false,
    is_subsidiary: subject.is_subsidiary || false,
    applicable_levels: subject.applicable_levels || ['S1', 'S2', 'S3', 'S4'],
  });
  setShowEditModal(true);
};

  const handleSearch = () => {
    fetchSubjects();
  };

  const getColorForSubject = (index) => {
    const colors = ['blue', 'green', 'purple', 'yellow', 'red', 'indigo'];
    return colors[index % colors.length];
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-600',
      green: 'bg-green-100 text-green-800 border-green-600',
      purple: 'bg-purple-100 text-purple-800 border-purple-600',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-600',
      red: 'bg-red-100 text-red-800 border-red-600',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-600',
    };
    return colors[color] || colors.blue;
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
            <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
            <p className="text-gray-600 mt-1">Manage curriculum subjects and combinations</p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to="/dashboard/subjects/combinations"
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FiBook className="w-5 h-5" />
              <span>Manage Combinations</span>
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Subject</span>
            </button>
          </div>
        </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject, index) => {
        const color = getColorForSubject(index);
        const colorClasses = getColorClasses(color);
        
        return (
          <div
            key={subject.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow ${colorClasses.split(' ').pop()}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colorClasses.split(' ').slice(0, 2).join(' ')}`}>
                    {subject.subject_code}
                  </span>
                  
                  {/* Type Badges */}
                  {subject.is_compulsory && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Compulsory
                    </span>
                  )}
                  
                  {!subject.is_compulsory && !subject.is_subsidiary && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Optional
                    </span>
                  )}
                  
                  {subject.is_subsidiary && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Subsidiary
                    </span>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mt-2">{subject.subject_name}</h2>
                
                {subject.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{subject.description}</p>
                )}
                
                {/* Applicable Levels */}
                {subject.applicable_levels && subject.applicable_levels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-gray-500">Levels:</span>
                    {subject.applicable_levels.map((level) => (
                      <span 
                        key={level} 
                        className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={() => openEditModal(subject)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <FiEdit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(subject)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <span className="text-sm text-gray-600 flex items-center">
                  <FiUsers className="w-4 h-4 mr-2" />
                  Teachers
                </span>
                <span className="font-semibold text-gray-900">{subject.teacher_count || 0}</span>
              </div>
            </div>

            <Link
              to={`/dashboard/subjects/${subject.id}`}
              className="mt-4 w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm block text-center"
            >
              View Details
            </Link>
          </div>
        );
      })}
    </div>

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'No subjects match your search' : 'Get started by adding your first subject'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Subject
            </button>
          )}
        </div>
      )}

      {/* Create Modal */}
                  {showCreateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Add Subject</h2>
                  <form onSubmit={handleCreate}>
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Subject Code *</label>
                        <input
                          type="text"
                          value={formData.subject_code}
                          onChange={(e) => setFormData({...formData, subject_code: e.target.value.toUpperCase()})}
                          className="form-input"
                          placeholder="e.g., MATH, ENG, SCI"
                          maxLength={10}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="form-label">Subject Name *</label>
                        <input
                          type="text"
                          value={formData.subject_name}
                          onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                          className="form-input"
                          placeholder="e.g., Mathematics"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="form-label">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="form-input"
                          rows="3"
                          placeholder="Brief description..."
                        />
                      </div>

                      {/* Subject Type - Radio Buttons */}
                      <div>
                        <label className="form-label">Subject Type *</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={!formData.is_subsidiary && formData.is_compulsory}
                              onChange={() => setFormData({...formData, is_compulsory: true, is_subsidiary: false})}
                              className="form-radio text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              <strong>Compulsory</strong> - All S1-S4 students must take this
                            </span>
                          </label>
                          
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={!formData.is_subsidiary && !formData.is_compulsory}
                              onChange={() => setFormData({...formData, is_compulsory: false, is_subsidiary: false})}
                              className="form-radio text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              <strong>Optional</strong> - S1-S4 students can choose (max 2)
                            </span>
                          </label>
                          
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              checked={formData.is_subsidiary}
                              onChange={() => setFormData({...formData, is_subsidiary: true, is_compulsory: false, applicable_levels: ['S5', 'S6']})}
                              className="form-radio text-blue-600"
                            />
                            <span className="text-sm text-gray-700">
                              <strong>Subsidiary</strong> - S5/S6 subsidiary subject
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Applicable Levels - Only show if not subsidiary */}
                      {!formData.is_subsidiary && (
                        <div>
                          <label className="form-label">Applicable Levels *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((level) => (
                              <label key={level} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.applicable_levels.includes(level)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData, 
                                        applicable_levels: [...formData.applicable_levels, level]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData, 
                                        applicable_levels: formData.applicable_levels.filter(l => l !== level)
                                      });
                                    }
                                  }}
                                  className="form-checkbox text-blue-600"
                                />
                                <span className="text-sm text-gray-700">{level}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Select which class levels offer this subject</p>
                        </div>
                      )}

                      {/* Info Boxes */}
                      {formData.is_compulsory && !formData.is_subsidiary && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong>Compulsory Subject:</strong> All students in selected levels will automatically be assigned this subject.
                          </p>
                        </div>
                      )}

                      {!formData.is_compulsory && !formData.is_subsidiary && (
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <p className="text-xs text-yellow-700">
                            <strong>Optional Subject:</strong> Students in selected levels can choose this as one of their 2 optional subjects.
                          </p>
                        </div>
                      )}

                      {formData.is_subsidiary && (
                        <div className="bg-purple-50 p-3 rounded-lg">
                          <p className="text-xs text-purple-700">
                            <strong>Subsidiary Subject:</strong> For S5/S6 students. General Paper is auto-assigned, others chosen by admin.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-6">
                      <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Create Subject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setFormData({ 
                            subject_code: '', 
                            subject_name: '', 
                            description: '',
                            is_compulsory: false,
                            is_subsidiary: false,
                            applicable_levels: ['S1', 'S2', 'S3', 'S4']
                          });
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
      {/* Edit Modal */}
      {showEditModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Subject</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Subject Code *</label>
                  <input
                    type="text"
                    value={formData.subject_code}
                    onChange={(e) => setFormData({...formData, subject_code: e.target.value.toUpperCase()})}
                    className="form-input"
                    maxLength={10}
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Subject Name *</label>
                  <input
                    type="text"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-input"
                    rows="3"
                  />
                </div>

                {/* Subject Type - Radio Buttons */}
                <div>
                  <label className="form-label">Subject Type *</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.is_subsidiary && formData.is_compulsory}
                        onChange={() => setFormData({...formData, is_compulsory: true, is_subsidiary: false})}
                        className="form-radio text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Compulsory</strong> - All S1-S4 students must take this
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.is_subsidiary && !formData.is_compulsory}
                        onChange={() => setFormData({...formData, is_compulsory: false, is_subsidiary: false})}
                        className="form-radio text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Optional</strong> - S1-S4 students can choose (max 2)
                      </span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.is_subsidiary}
                        onChange={() => setFormData({...formData, is_subsidiary: true, is_compulsory: false, applicable_levels: ['S5', 'S6']})}
                        className="form-radio text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        <strong>Subsidiary</strong> - S5/S6 subsidiary subject
                      </span>
                    </label>
                  </div>
                </div>

                {/* Applicable Levels - Only show if not subsidiary */}
                {!formData.is_subsidiary && (
                  <div>
                    <label className="form-label">Applicable Levels *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((level) => (
                        <label key={level} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.applicable_levels?.includes(level)}
                            onChange={(e) => {
                              const currentLevels = formData.applicable_levels || [];
                              if (e.target.checked) {
                                setFormData({
                                  ...formData, 
                                  applicable_levels: [...currentLevels, level]
                                });
                              } else {
                                setFormData({
                                  ...formData, 
                                  applicable_levels: currentLevels.filter(l => l !== level)
                                });
                              }
                            }}
                            className="form-checkbox text-blue-600"
                          />
                          <span className="text-sm text-gray-700">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Update Subject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSubject(null);
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

export default SubjectsPage;