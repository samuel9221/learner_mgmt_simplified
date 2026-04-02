// ============================================================================
// CLASSES PAGE - CONNECTED TO BACKEND
// Manage classes and streams
// ============================================================================

import React, { useState, useEffect } from 'react';
import { FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as classService from '../../services/classService';
import { Link } from 'react-router-dom';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateStreamModal, setShowCreateStreamModal] = useState(false);
  const [showEditStreamModal, setShowEditStreamModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStream, setSelectedStream] = useState(null);
  
  const [classFormData, setClassFormData] = useState({
    class_name: '',
  });

  const [streamFormData, setStreamFormData] = useState({
    stream_name: '',
    stream_teacher_id: '',
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await classService.getClasses();
      if (response.success) {
        setClasses(response.data);
      }
    } catch (error) {
      toast.error('Failed to load classes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await classService.getAvailableTeachers();
      if (response.success) {
        setTeachers(response.data);
      }
    } catch (error) {
      console.error('Failed to load teachers:', error);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const response = await classService.createClass(classFormData);
      if (response.success) {
        toast.success('Class created successfully');
        setShowCreateClassModal(false);
        setClassFormData({ class_name: ''});
        fetchClasses();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create class';
      toast.error(message);
    }
  };

  const handleCreateStream = async (e) => {
    e.preventDefault();
    try {
      const response = await classService.createStream(selectedClass.id, streamFormData);
      if (response.success) {
        toast.success('Stream created successfully');
        setShowCreateStreamModal(false);
        setStreamFormData({ stream_name: '', stream_teacher_id: '' });
        setSelectedClass(null);
        fetchClasses();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create stream';
      toast.error(message);
    }
  };

  const handleUpdateStream = async (e) => {
    e.preventDefault();
    try {
      const response = await classService.updateStream(selectedStream.id, streamFormData);
      if (response.success) {
        toast.success('Stream updated successfully');
        setShowEditStreamModal(false);
        setSelectedStream(null);
        fetchClasses();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update stream';
      toast.error(message);
    }
  };

  const handleDeleteStream = async (stream) => {
    if (!window.confirm(`Are you sure you want to delete ${stream.stream_name}?`)) {
      return;
    }

    try {
      const response = await classService.deleteStream(stream.id);
      if (response.success) {
        toast.success('Stream deleted successfully');
        fetchClasses();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete stream';
      toast.error(message);
    }
  };

  const openCreateStreamModal = (classItem) => {
    setSelectedClass(classItem);
    setStreamFormData({ stream_name: '', stream_teacher_id: '' });
    setShowCreateStreamModal(true);
  };

  const openEditStreamModal = (stream) => {
    setSelectedStream(stream);
    setStreamFormData({
      stream_name: stream.stream_name,
      stream_teacher_id: stream.stream_teacher_id || '',
    });
    setShowEditStreamModal(true);
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not assigned';
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
          <h1 className="text-3xl font-bold text-gray-900">Classes & Streams</h1>
          <p className="text-gray-600 mt-1">Manage classes and their streams</p>
        </div>
        <button
          onClick={() => setShowCreateClassModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classes.map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{classItem.class_name}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {classItem.stream_count || 0} streams · {classItem.total_learners || 0} learners
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FiUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Streams */}
            <div className="space-y-3">
              {classItem.streams && classItem.streams.length > 0 ? (
                classItem.streams.map((stream) => (
                  <Link
                    key={stream.id}
                    to={`/dashboard/classes/stream/${stream.id}`}
                    state={{
                      stream_name: stream.stream_name,
                      class_name: classItem.class_name,
                      teacher_name: stream.teacher_first_name 
                        ? `${stream.teacher_first_name} ${stream.teacher_last_name}`
                        : 'Not assigned',
                      learner_count: stream.learner_count || 0,
                    }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{stream.stream_name}</h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiUsers className="w-3 h-3 mr-1" />
                          {stream.learner_count || 0} learners
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          <FiUser className="w-3 h-3 mr-1" />
                          {stream.teacher_first_name 
                            ? `${stream.teacher_first_name} ${stream.teacher_last_name}`
                            : 'No teacher assigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openEditStreamModal(stream);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteStream(stream);
                        }}
                        className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">No streams yet</p>
                  <button
                    onClick={() => openCreateStreamModal(classItem)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add First Stream
                  </button>
                </div>
              )}
            </div>

            {/* Add Stream Button */}
            {classItem.streams && classItem.streams.length > 0 && (
              <button
                onClick={() => openCreateStreamModal(classItem)}
                className="mt-4 w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
              >
                + Add Stream
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Found</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first class</p>
          <button
            onClick={() => setShowCreateClassModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Class
          </button>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Class</h2>
            <form onSubmit={handleCreateClass}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Class Name *</label>
                  <input
                    type="text"
                    value={classFormData.class_name}
                    onChange={(e) => setClassFormData({...classFormData, class_name: e.target.value})}
                    className="form-input"
                    placeholder="e.g., S1, S2, S3, S4"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create Class
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateClassModal(false);
                    setClassFormData({ class_name: ''});
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

      {/* Create Stream Modal */}
      {showCreateStreamModal && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add Stream to {selectedClass.class_name}
            </h2>
            <form onSubmit={handleCreateStream}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Stream Name *</label>
                  <input
                    type="text"
                    value={streamFormData.stream_name}
                    onChange={(e) => setStreamFormData({...streamFormData, stream_name: e.target.value})}
                    className="form-input"
                    placeholder="e.g., S1 East, S1 West"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Class Teacher</label>
                  <select
                    value={streamFormData.class_teacher_id}
                    onChange={(e) => setStreamFormData({...streamFormData, stream_teacher_id: e.target.value})}
                    className="form-select"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} 
                        {teacher.assigned_classes_count > 0 && ` (${teacher.assigned_classes_count} classes)`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Optional - can be assigned later</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create Stream
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateStreamModal(false);
                    setSelectedClass(null);
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

      {/* Edit Stream Modal */}
      {showEditStreamModal && selectedStream && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Stream</h2>
            <form onSubmit={handleUpdateStream}>
              <div className="space-y-4">
                <div>
                  <label className="form-label">Stream Name *</label>
                  <input
                    type="text"
                    value={streamFormData.stream_name}
                    onChange={(e) => setStreamFormData({...streamFormData, stream_name: e.target.value})}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Class Teacher</label>
                  <select
                    value={streamFormData.stream_teacher_id}
                    onChange={(e) => setStreamFormData({...streamFormData, stream_teacher_id: e.target.value})}
                    className="form-select"
                  >
                    <option value="">-- No Teacher --</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                        {teacher.assigned_classes_count > 0 && ` (${teacher.assigned_classes_count} classes)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Update Stream
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStreamModal(false);
                    setSelectedStream(null);
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

export default ClassesPage;