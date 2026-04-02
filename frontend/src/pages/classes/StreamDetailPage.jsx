// ============================================================================
// STREAM DETAIL PAGE
// Manage subject assignments for a stream
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiTrash2, FiUsers, FiBook, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as subjectStreamTeacherService from '../../services/subjectStreamTeacherService';
import * as subjectService from '../../services/subjectService';

const StreamDetailPage = () => {
  const { streamId } = useParams();
  const location = useLocation();
  const streamInfo = location.state; // Passed from classes page
  
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    subject_id: '',
    teacher_id: '',
  });

  useEffect(() => {
    fetchData();
  }, [streamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments for this stream
      const assignmentsResponse = await subjectStreamTeacherService.getStreamAssignments(streamId);
      if (assignmentsResponse.success) {
        setAssignments(assignmentsResponse.data);
      }

      // Fetch all subjects
      const subjectsResponse = await subjectService.getSubjects();
      if (subjectsResponse.success) {
        setSubjects(subjectsResponse.data);
      }

      // Fetch available teachers
      const teachersResponse = await subjectStreamTeacherService.getAvailableTeachers();
      if (teachersResponse.success) {
        setTeachers(teachersResponse.data);
      }
    } catch (error) {
      toast.error('Failed to load stream details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const response = await subjectStreamTeacherService.assignTeacherToSubject({
        subject_id: assignFormData.subject_id,
        stream_id: streamId,
        teacher_id: assignFormData.teacher_id,
      });

      if (response.success) {
        toast.success('Teacher assigned to subject successfully');
        setShowAssignModal(false);
        setAssignFormData({ subject_id: '', teacher_id: '' });
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to assign teacher';
      toast.error(message);
    }
  };

  const handleRemoveAssignment = async (assignment) => {
    if (!window.confirm(`Remove ${assignment.teacher_name} from ${assignment.subject_name}?`)) {
      return;
    }

    try {
      const response = await subjectStreamTeacherService.deleteAssignment(assignment.id);
      if (response.success) {
        toast.success('Assignment removed successfully');
        fetchData();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove assignment';
      toast.error(message);
    }
  };

  // Get subjects not yet assigned in this stream
  const availableSubjects = subjects.filter(
    subject => !assignments.find(a => a.subject_id === subject.id)
  );

  // Get teachers who can still be assigned (not at max 3 subjects)
  const availableTeachers = teachers.filter(t => t.can_assign_more);

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
        to="/dashboard/classes"
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <FiArrowLeft />
        <span>Back to Classes</span>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{streamInfo?.stream_name || 'Stream Details'}</h1>
            <p className="text-gray-600 mt-1">
              Class: {streamInfo?.class_name} • Teacher: {streamInfo?.teacher_name || 'Not assigned'}
            </p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Assign Subject</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subjects Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
              </div>
              <FiBook className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Teachers Assigned</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(assignments.map(a => a.teacher_id)).size}
                </p>
              </div>
              <FiUser className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Learners</p>
                <p className="text-2xl font-bold text-gray-900">{streamInfo?.learner_count || 0}</p>
              </div>
              <FiUsers className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Subject Assignments */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Subject Assignments</h2>

        {assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {assignment.subject_code}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{assignment.subject_name}</h3>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-sm text-gray-600 flex items-center">
                      <FiUser className="w-4 h-4 mr-1" />
                      Teacher: {assignment.teacher_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAssignment(assignment)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <FiTrash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subjects Assigned</h3>
            <p className="text-gray-600 mb-6">
              Start by assigning subjects and teachers to this stream
            </p>
            <button
              onClick={() => setShowAssignModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Assign First Subject
            </button>
          </div>
        )}
      </div>

      {/* Assign Subject Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Assign Subject & Teacher</h2>
            <form onSubmit={handleAssign}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Subject *</label>
                  <select
                    value={assignFormData.subject_id}
                    onChange={(e) => setAssignFormData({...assignFormData, subject_id: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">-- Select Subject --</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.subject_code} - {subject.subject_name}
                      </option>
                    ))}
                  </select>
                  {availableSubjects.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">All subjects have been assigned</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Teacher *</label>
                  <select
                    value={assignFormData.teacher_id}
                    onChange={(e) => setAssignFormData({...assignFormData, teacher_id: e.target.value})}
                    className="form-select"
                    required
                  >
                    <option value="">-- Select Teacher --</option>
                    {availableTeachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} 
                        ({teacher.subject_count}/3 subjects)
                      </option>
                    ))}
                  </select>
                  {availableTeachers.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No teachers available (all at maximum 3 subjects)
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Each teacher can teach a maximum of 3 different subjects.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={availableSubjects.length === 0 || availableTeachers.length === 0}
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignFormData({ subject_id: '', teacher_id: '' });
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

export default StreamDetailPage;