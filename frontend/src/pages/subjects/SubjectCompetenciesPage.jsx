// ============================================================================
// SUBJECT COMPETENCIES PAGE
// Manage competency areas and competencies for a subject
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as competencyService from '../../services/competencyService';
import * as subjectService from '../../services/subjectService';

const SubjectCompetenciesPage = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [areas, setAreas] = useState([]);
  const [expandedAreas, setExpandedAreas] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  
  // Form data
  const [areaFormData, setAreaFormData] = useState({
    competency_name: '',
    description: '',
    order_number: 0,
  });
  
  const [competencyFormData, setCompetencyFormData] = useState({
    competency_code: '',
    competency_text: '',
    order_number: 0,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subject
      const subjectResponse = await subjectService.getSubjectById(id);
      if (subjectResponse.success) {
        setSubject(subjectResponse.data);
      }
      
      // Fetch competency areas
      await fetchAreas();
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await competencyService.getSubjectCompetencyAreas(id);
      if (response.success) {
        setAreas(response.data);
        
        // Auto-expand areas with competencies
        const expanded = {};
        response.data.forEach(area => {
          if (area.competency_count > 0) {
            expanded[area.id] = true;
            fetchCompetenciesForArea(area.id);
          }
        });
        setExpandedAreas(expanded);
      }
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchCompetenciesForArea = async (areaId) => {
    try {
      const response = await competencyService.getAreaCompetencies(areaId);
      if (response.success) {
        setAreas(prev => prev.map(area => 
          area.id === areaId 
            ? { ...area, competencies: response.data }
            : area
        ));
      }
    } catch (error) {
      console.error('Error fetching competencies:', error);
    }
  };

  const toggleArea = async (areaId) => {
    const isExpanded = expandedAreas[areaId];
    
    if (!isExpanded) {
      // Fetch competencies if not already loaded
      const area = areas.find(a => a.id === areaId);
      if (!area.competencies) {
        await fetchCompetenciesForArea(areaId);
      }
    }
    
    setExpandedAreas(prev => ({
      ...prev,
      [areaId]: !isExpanded,
    }));
  };

  // Area CRUD
  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      const response = await competencyService.createCompetencyArea({
        subject_id: id,
        ...areaFormData,
      });
      
      if (response.success) {
        toast.success('Competency area created');
        setShowAreaModal(false);
        setAreaFormData({ competency_name: '', description: '', order_number: 0 });
        fetchAreas();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create area');
    }
  };

  const handleUpdateArea = async (e) => {
    e.preventDefault();
    try {
      const response = await competencyService.updateCompetencyArea(editingArea.id, areaFormData);
      
      if (response.success) {
        toast.success('Competency area updated');
        setShowAreaModal(false);
        setEditingArea(null);
        fetchAreas();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update area');
    }
  };

  const handleDeleteArea = async (area) => {
    if (!window.confirm(`Delete "${area.competency_name}"? This will delete all competencies in this area.`)) {
      return;
    }
    
    try {
      const response = await competencyService.deleteCompetencyArea(area.id);
      if (response.success) {
        toast.success('Competency area deleted');
        fetchAreas();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete area');
    }
  };

  const openEditAreaModal = (area) => {
    setEditingArea(area);
    setAreaFormData({
      competency_name: area.competency_name,
      description: area.description || '',
      order_number: area.order_number || 0,
    });
    setShowAreaModal(true);
  };

  // Competency CRUD
  const handleCreateCompetency = async (e) => {
    e.preventDefault();
    try {
      const response = await competencyService.createCompetency({
        competency_area_id: selectedArea.id,
        subject_id: id,
        ...competencyFormData,
      });
      
      if (response.success) {
        toast.success('Competency created');
        setShowCompetencyModal(false);
        setCompetencyFormData({ competency_code: '', competency_text: '', order_number: 0 });
        fetchCompetenciesForArea(selectedArea.id);
        fetchAreas(); // Refresh count
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create competency');
    }
  };

  const handleUpdateCompetency = async (e) => {
    e.preventDefault();
    try {
      const response = await competencyService.updateCompetency(editingCompetency.id, competencyFormData);
      
      if (response.success) {
        toast.success('Competency updated');
        setShowCompetencyModal(false);
        setEditingCompetency(null);
        fetchCompetenciesForArea(selectedArea.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update competency');
    }
  };

  const handleDeleteCompetency = async (competency) => {
    if (!window.confirm(`Delete this competency?`)) {
      return;
    }
    
    try {
      const response = await competencyService.deleteCompetency(competency.id);
      if (response.success) {
        toast.success('Competency deleted');
        fetchCompetenciesForArea(selectedArea.id);
        fetchAreas(); // Refresh count
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete competency');
    }
  };

  const openAddCompetencyModal = (area) => {
    setSelectedArea(area);
    setEditingCompetency(null);
    setCompetencyFormData({ competency_code: '', competency_text: '', order_number: 0 });
    setShowCompetencyModal(true);
  };

  const openEditCompetencyModal = (area, competency) => {
    setSelectedArea(area);
    setEditingCompetency(competency);
    setCompetencyFormData({
      competency_code: competency.competency_code || '',
      competency_text: competency.competency_text,
      order_number: competency.order_number || 0,
    });
    setShowCompetencyModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subject) {
    return <div className="text-center py-12">Subject not found</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <Link
        to={`/dashboard/subjects/${id}`}
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Subject</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Competencies</h1>
            <p className="text-gray-600 mt-1">
              {subject.subject_code} - {subject.subject_name}
            </p>
          </div>
          <button
            onClick={() => {
              setEditingArea(null);
              setAreaFormData({ competency_name: '', description: '', order_number: 0 });
              setShowAreaModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Competency Area</span>
          </button>
        </div>
      </div>

      {/* Competency Areas */}
      {areas.length > 0 ? (
        <div className="space-y-4">
          {areas.map((area) => (
            <div key={area.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Area Header */}
              <div className="bg-gray-50 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    {expandedAreas[area.id] ? (
                      <FiChevronDown className="w-5 h-5" />
                    ) : (
                      <FiChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{area.competency_name}</h3>
                    {area.description && (
                      <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {area.competency_count} competenc{area.competency_count === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openAddCompetencyModal(area)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Add Competency"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditAreaModal(area)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteArea(area)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Competencies List */}
              {expandedAreas[area.id] && (
                <div className="p-4">
                  {area.competencies && area.competencies.length > 0 ? (
                    <div className="space-y-2">
                      {area.competencies.map((competency, index) => (
                        <div
                          key={competency.id}
                          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start space-x-3 flex-1">
                            <span className="inline-block w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              {competency.competency_code && (
                                <span className="text-xs font-semibold text-gray-500 mr-2">
                                  [{competency.competency_code}]
                                </span>
                              )}
                              <p className="text-gray-900">{competency.competency_text}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openEditCompetencyModal(area, competency)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompetency(competency)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No competencies yet</p>
                      <button
                        onClick={() => openAddCompetencyModal(area)}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Add first competency
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Competency Areas</h3>
          <p className="text-gray-600 mb-6">
            Start by creating competency areas to organize your subject's competencies
          </p>
          <button
            onClick={() => {
              setEditingArea(null);
              setAreaFormData({ competency_name: '', description: '', order_number: 0 });
              setShowAreaModal(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Area
          </button>
        </div>
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingArea ? 'Edit' : 'Add'} Competency Area
            </h2>
            <form onSubmit={editingArea ? handleUpdateArea : handleCreateArea}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Area Name *</label>
                  <input
                    type="text"
                    value={areaFormData.competency_name}
                    onChange={(e) => setAreaFormData({...areaFormData, competency_name: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Knowledge & Understanding"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={areaFormData.description}
                    onChange={(e) => setAreaFormData({...areaFormData, description: e.target.value})}
                    className="form-input"
                    rows="3"
                    placeholder="Brief description of this area"
                  />
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    value={areaFormData.order_number}
                    onChange={(e) => setAreaFormData({...areaFormData, order_number: parseInt(e.target.value)})}
                    className="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  {editingArea ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAreaModal(false);
                    setEditingArea(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Competency Modal */}
      {showCompetencyModal && selectedArea && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCompetency ? 'Edit' : 'Add'} Competency
            </h2>
            <p className="text-sm text-gray-600 mb-4">Area: {selectedArea.competency_name}</p>
            <form onSubmit={editingCompetency ? handleUpdateCompetency : handleCreateCompetency}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Competency Code (Optional)</label>
                  <input
                    type="text"
                    value={competencyFormData.competency_code}
                    onChange={(e) => setCompetencyFormData({...competencyFormData, competency_code: e.target.value})}
                    className="form-input"
                    placeholder="e.g., K1, A2, P3"
                  />
                </div>
                <div>
                  <label className="form-label">Competency Text *</label>
                  <textarea
                    value={competencyFormData.competency_text}
                    onChange={(e) => setCompetencyFormData({...competencyFormData, competency_text: e.target.value})}
                    className="form-input"
                    rows="4"
                    placeholder="e.g., Identify the main parts of a plant cell"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    value={competencyFormData.order_number}
                    onChange={(e) => setCompetencyFormData({...competencyFormData, order_number: parseInt(e.target.value)})}
                    className="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  {editingCompetency ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompetencyModal(false);
                    setEditingCompetency(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
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

export default SubjectCompetenciesPage;