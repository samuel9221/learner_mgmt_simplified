import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiFilter, FiDownload, FiEye } from 'react-icons/fi';

const LearnersPage = () => {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setLearners([
        { id: '1', name: 'John Doe', class: 'S1 East', gender: 'Male', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '2', name: 'Jane Smith', class: 'S1 East', gender: 'Female', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '3', name: 'Robert Johnson', class: 'S1 West', gender: 'Male', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '4', name: 'Emily Brown', class: 'S2 East', gender: 'Female', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '5', name: 'Michael Wilson', class: 'S2 West', gender: 'Male', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '6', name: 'Sarah Davis', class: 'S3 East', gender: 'Female', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '7', name: 'David Martinez', class: 'S3 West', gender: 'Male', status: 'Active', enrollment_date: '2024-02-01' },
        { id: '8', name: 'Lisa Anderson', class: 'S4 East', gender: 'Female', status: 'Active', enrollment_date: '2024-02-01' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredLearners = learners.filter(learner =>
    learner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    learner.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learners</h1>
          <p className="text-gray-600 mt-1">{learners.length} total learners</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            <FiDownload className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <FiPlus className="w-5 h-5" />
            <span>Add Learner</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            <FiFilter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Learners Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Class</th>
              <th>Gender</th>
              <th>Status</th>
              <th>Enrollment Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLearners.map((learner) => (
              <tr key={learner.id}>
                <td className="font-medium text-gray-900">{learner.name}</td>
                <td>{learner.class}</td>
                <td>{learner.gender}</td>
                <td>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {learner.status}
                  </span>
                </td>
                <td>{new Date(learner.enrollment_date).toLocaleDateString()}</td>
                <td>
                  <Link
                    to={`/dashboard/learners/${learner.id}`}
                    className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                  >
                    <FiEye className="w-4 h-4" />
                    <span className="text-sm">View</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LearnersPage;