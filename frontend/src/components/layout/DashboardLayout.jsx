import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiCalendar,
  FiClock,
  FiUsers,
  FiBook,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi';
import { useAuthStore } from '../../context/authStore';
import toast from 'react-hot-toast';

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: FiHome,
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      name: 'Academic Years',
      path: '/dashboard/academic-years',
      icon: FiCalendar,
      roles: ['super_admin'],
    },
    {
      name: 'Terms',
      path: '/dashboard/terms',
      icon: FiClock,
      roles: ['super_admin', 'admin'],
    },
    {
      name: 'Classes',
      path: '/dashboard/classes',
      icon: FiUsers,
      roles: ['super_admin', 'admin'],
    },
    {
      name: 'Subjects',
      path: '/dashboard/subjects',
      icon: FiBook,
      roles: ['super_admin', 'admin'],
    },
    {
      name: 'Learners',
      path: '/dashboard/learners',
      icon: FiUserPlus,
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      name: 'Assessments',
      path: '/dashboard/assessments',
      icon: FiFileText,
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      name: 'Reports',
      path: '/dashboard/reports',
      icon: FiBarChart2,
      roles: ['super_admin', 'admin', 'teacher'],
    },
    {
      name: 'Users',
      path: '/dashboard/users',
      icon: FiUser,
      roles: ['super_admin', 'admin'],
    },
    {
      name: 'Settings',
      path: '/dashboard/settings',
      icon: FiSettings,
      roles: ['super_admin', 'admin', 'teacher'],
    },
  ];

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        onClick={() => setSidebarOpen(false)}
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-primary-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <FiBook className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-display font-bold text-gray-900">SMS</h1>
                <p className="text-xs text-gray-500">NLSC Uganda</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink key={item.path} item={item} />
            ))}
          </nav>

          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              className="block w-full text-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 mb-2 transition-colors"
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
            >
              <FiLogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <FiMenu className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-500">Academic Year:</span>
              <span className="ml-2 font-semibold text-primary-600">2024/2025</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Term:</span>
              <span className="ml-2 font-semibold text-primary-600">1</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;