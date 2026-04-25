// ============================================================================
// SUBJECT DETAIL PAGE
// View and manage subject papers
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiEdit2, FiTrash2, FiBook } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as subjectService from '../../services/subjectService';

const SubjectDetailPage = () => {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPaperModal, setShowAddPaperModal] = useState(false);
  const [showEditPaperModal, setShowEditPaperModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [paperFormData, setPaperFormData] = useState({
    paper_number: '',
    paper_name: '',
  });

  useEffect(() => {
    fetchSubjectDetails();
  }, [id]);

  const fetchSubjectDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch subject
      const subjectResponse = await subjectService.getSubjectById(id);
      if (subjectResponse.success) {
        setSubject(subjectResponse.data);
      }

      // Fetch papers
      const papersResponse = await subjectService.getSubjectPapers(id);
      if (papersResponse.success) {
        setPapers(papersResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load subject details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaper = async (e) => {
    e.preventDefault();
    try {
      const response = await subjectService.addSubjectPaper(id, paperFormData);
      if (response.success) {
        toast.success('Paper added successfully');
        setShowAddPaperModal(false);
        setPaperFormData({ paper_number: '', paper_name: '' });
        fetchSubjectDetails();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add paper';
      toast.error(message);
    }
  };

  const handleUpdatePaper = async (e) => {
    e.preventDefault();
    try {
      const response = await subjectService.updateSubjectPaper(selectedPaper.id, paperFormData);
      if (response.success) {
        toast.success('Paper updated successfully');
        setShowEditPaperModal(false);
        setSelectedPaper(null);
        fetchSubjectDetails();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update paper';
      toast.error(message);
    }
  };

  const handleDeletePaper = async (paper) => {
    if (!window.confirm(`Are you sure you want to delete Paper ${paper.paper_number}?`)) {
      return;
    }

    try {
      const response = await subjectService.deleteSubjectPaper(paper.id);
      if (response.success) {
        toast.success('Paper deleted successfully');
        fetchSubjectDetails();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete paper';
      toast.error(message);
    }
  };

  const openEditPaperModal = (paper) => {
    setSelectedPaper(paper);
    setPaperFormData({
      paper_number: paper.paper_number,
      paper_name: paper.paper_name || '',
    });
    setShowEditPaperModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Subject not found</p>
        <Link to="/dashboard/subjects" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Back to Subjects
        </Link>
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* In the header section, add this button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {subject.subject_code}
              </span>
              <h1 className="text-3xl font-bold text-gray-900">{subject.subject_name}</h1>
            </div>
            {subject.description && (
              <p className="text-gray-600 mt-2">{subject.description}</p>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Papers</p>
            <p className="text-2xl font-bold text-gray-900">{papers.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Teachers</p>
            <p className="text-2xl font-bold text-gray-900">{subject.teacher_count || 0}</p>
          </div>
        </div>
      </div>

      {/* Papers Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Subject Papers</h2>
          <button
            onClick={() => setShowAddPaperModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Paper</span>
          </button>
        </div>

        {papers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Paper {paper.paper_number}</h3>
                    {paper.paper_name && (
                      <p className="text-sm text-gray-600 mt-1">{paper.paper_name}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditPaperModal(paper)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePaper(paper)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Papers Yet</h3>
            <p className="text-gray-600 mb-6">
              This subject doesn't have any papers. Add papers if this subject has multiple components.
            </p>
            <button
              onClick={() => setShowAddPaperModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Paper
            </button>
          </div>
        )}
      </div>

      {/* Add Paper Modal */}
      {showAddPaperModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Paper</h2>
            <form onSubmit={handleAddPaper}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Paper Number *</label>
                  <input
                    type="number"
                    value={paperFormData.paper_number}
                    onChange={(e) => setPaperFormData({...paperFormData, paper_number: e.target.value})}
                    className="form-input"
                    placeholder="e.g., 1, 2, 3"
                    min="1"
                    max="10"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Paper Name (Optional)</label>
                  <input
                    type="text"
                    value={paperFormData.paper_name}
                    onChange={(e) => setPaperFormData({...paperFormData, paper_name: e.target.value})}
                    className="form-input"
                    placeholder="e.g., Theory, Practical, Essay"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Add Paper
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPaperModal(false);
                    setPaperFormData({ paper_number: '', paper_name: '' });
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

      {/* Edit Paper Modal */}
      {showEditPaperModal && selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Paper</h2>
            <form onSubmit={handleUpdatePaper}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Paper Number *</label>
                  <input
                    type="number"
                    value={paperFormData.paper_number}
                    onChange={(e) => setPaperFormData({...paperFormData, paper_number: e.target.value})}
                    className="form-input"
                    min="1"
                    max="10"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Paper Name (Optional)</label>
                  <input
                    type="text"
                    value={paperFormData.paper_name}
                    onChange={(e) => setPaperFormData({...paperFormData, paper_name: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Update Paper
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPaperModal(false);
                    setSelectedPaper(null);
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

export default SubjectDetailPage;