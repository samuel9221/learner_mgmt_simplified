// ============================================================================
// USERS PAGE - CONNECTED TO BACKEND
// Manage system users with real API integration
// ============================================================================

import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiShield, FiUser, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/userService';
import * as excelService from '../../services/excelService';
import UserFormModal from '../../components/users/UserFormModal';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers({ search: searchTerm });
      
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: { color: 'bg-purple-100 text-purple-800', label: 'Super Admin', icon: FiShield },
      admin: { color: 'bg-blue-100 text-blue-800', label: 'Admin', icon: FiShield },
      teacher: { color: 'bg-green-100 text-green-800', label: 'Teacher', icon: FiUser },
    };
    return badges[role] || badges.teacher;
  };

  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesRole;
  });

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleSubmitUser = async (data) => {
    try {
      setIsSubmitting(true);
      
      if (selectedUser) {
        // Update existing user
        const response = await updateUser(selectedUser.id, data);
        
        if (response.success) {
          toast.success('User updated successfully');
          fetchUsers();
          setIsModalOpen(false);
        }
      } else {
        // Create new user
        const response = await createUser(data);
        
        if (response.success) {
          toast.success('User created successfully');
          fetchUsers();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to save user';
      toast.error(errorMessage);
      console.error('Error saving user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        const response = await deleteUser(userId);
        
        if (response.success) {
          toast.success('User deleted successfully');
          fetchUsers();
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || 'Failed to delete user';
        toast.error(errorMessage);
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleDownloadUsers = async () => {
    try {
      await excelService.downloadUsersExcel();
      toast.success('Users list downloaded successfully');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to download users list';
      toast.error(message);
      console.error('Error downloading users:', error);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">{users.length} total users</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadUsers}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiDownload className="w-5 h-5" />
            <span>Download Excel</span>
          </button>
          <button
            onClick={handleCreateUser}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="stat-card stat-card-primary">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Super Admins</h3>
          <p className="text-3xl font-bold text-gray-900">
            {users.filter(u => u.role === 'super_admin').length}
          </p>
        </div>
        <div className="stat-card stat-card-success">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Admins</h3>
          <p className="text-3xl font-bold text-gray-900">
            {users.filter(u => u.role === 'admin').length}
          </p>
        </div>
        <div className="stat-card stat-card-warning">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Teachers</h3>
          <p className="text-3xl font-bold text-gray-900">
            {users.filter(u => u.role === 'teacher').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              const RoleIcon = roleBadge.icon;
              
              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-700 font-semibold">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.first_name} {user.last_name}</p>
                      </div>
                    </div>
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {roleBadge.label}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-gray'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit user"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        disabled={user.role === 'super_admin'}
                        title="Delete user"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center mt-6">
          <FiUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-600">No users match your search criteria</p>
        </div>
      )}

      {/* User Form Modal */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitUser}
        user={selectedUser}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default UsersPage;