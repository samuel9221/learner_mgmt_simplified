// ============================================================================
// DASHBOARD HOME PAGE
// Main dashboard with statistics and quick actions
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiBook, 
  FiCalendar, 
  FiCheckCircle,
  FiTrendingUp,
  FiAward,
  FiBookOpen,
  FiUserCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';
import { getDashboardStats } from '../../services/dashboardService';
import StatCard from '../../components/dashboard/StatCard';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentActivity from '../../components/dashboard/RecentActivity';
import UpcomingDeadlines from '../../components/dashboard/UpcomingDeadlines';

const DashboardHome = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalClasses: 0,
    totalTeachers: 0,
    assessmentCompletion: 0,
    activeAcademicYear: '',
    currentTerm: '',
    recentEnrollments: 0,
    pendingAssessments: 0
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      type: 'assessment',
      title: 'Assessment Completed',
      description: 'S2 East - Mathematics - Term 1 Assessment',
      time: '2 hours ago'
    },
    {
      type: 'user',
      title: 'New Learner Enrolled',
      description: 'John Doe added to S1 West',
      time: '5 hours ago'
    },
    {
      type: 'system',
      title: 'Report Generated',
      description: 'End of term reports for S3',
      time: '1 day ago'
    },
    {
      type: 'assessment',
      title: 'Assessment Submitted',
      description: 'S1 East - English - Competency Assessment',
      time: '2 days ago'
    },
  ]);

  const [upcomingDeadlines, setUpcomingDeadlines] = useState([
    {
      title: 'Term 1 Assessment Deadline',
      description: 'Complete all competency assessments',
      date: 'March 25, 2026',
      daysLeft: 13,
      priority: 'high'
    },
    {
      title: 'Report Card Generation',
      description: 'Generate end of term reports',
      date: 'March 30, 2026',
      daysLeft: 18,
      priority: 'medium'
    },
    {
      title: 'Staff Meeting',
      description: 'Term review and planning',
      date: 'March 20, 2026',
      daysLeft: 8,
      priority: 'low'
    },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await getDashboardStats();
        
        if (response.success) {
          setStats({
            totalLearners: response.data.totalLearners,
            totalClasses: response.data.totalClasses,
            totalTeachers: response.data.totalTeachers,
            assessmentCompletion: response.data.assessmentCompletion,
            activeAcademicYear: response.data.currentAcademicYear,
            currentTerm: response.data.currentTerm,
            recentEnrollments: response.data.recentEnrollments,
            pendingAssessments: response.data.pendingAssessments
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getRoleSpecificStats = () => {
    switch (user?.role) {
      case 'super_admin':
        return [
          { title: 'Total Learners', value: stats.totalLearners, icon: FiUsers, color: 'blue', trend: 'up', trendValue: '12%' },
          { title: 'Total Classes', value: stats.totalClasses, icon: FiBook, color: 'green', trend: 'up', trendValue: '8%' },
          { title: 'Total Teachers', value: stats.totalTeachers, icon: FiUserCheck, color: 'purple', trend: 'up', trendValue: '5%' },
          { title: 'Assessment Completion', value: `${stats.assessmentCompletion}%`, icon: FiCheckCircle, color: 'yellow', trend: 'up', trendValue: '15%' },
        ];
      
      case 'admin':
        return [
          { title: 'Total Learners', value: stats.totalLearners, icon: FiUsers, color: 'blue', trend: 'up', trendValue: '12%' },
          { title: 'Active Classes', value: stats.totalClasses, icon: FiBookOpen, color: 'green' },
          { title: 'Recent Enrollments', value: stats.recentEnrollments, icon: FiTrendingUp, color: 'purple', trend: 'up', trendValue: '20%' },
          { title: 'Assessment Completion', value: `${stats.assessmentCompletion}%`, icon: FiCheckCircle, color: 'yellow', trend: 'up', trendValue: '15%' },
        ];
      
      case 'teacher':
        return [
          { title: 'My Classes', value: 4, icon: FiBook, color: 'blue' },
          { title: 'My Learners', value: 156, icon: FiUsers, color: 'green' },
          { title: 'Pending Assessments', value: stats.pendingAssessments, icon: FiCalendar, color: 'yellow' },
          { title: 'Completion Rate', value: `${stats.assessmentCompletion}%`, icon: FiAward, color: 'purple', trend: 'up', trendValue: '10%' },
        ];
      
      default:
        return [];
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
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getGreeting()}, {user?.first_name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening in your school today
        </p>
      </div>

      {/* Academic Year Info Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-md p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Academic Year {stats.activeAcademicYear}</h2>
            <p className="text-blue-100">Currently in {stats.currentTerm}</p>
          </div>
          <div className="hidden md:block">
            <FiCalendar className="w-16 h-16 opacity-20" />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {getRoleSpecificStats().map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            trend={stat.trend}
            trendValue={stat.trendValue}
          />
        ))}
      </div>

      {/* Quick Actions & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions - 2 columns */}
        <div className="lg:col-span-2">
          <QuickActions role={user?.role} />
        </div>

        {/* Upcoming Deadlines - 1 column */}
        <div className="lg:col-span-1">
          <UpcomingDeadlines deadlines={upcomingDeadlines} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivities} />

        {/* System Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Academic Year</span>
              <span className="font-semibold text-gray-900">{stats.activeAcademicYear}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Current Term</span>
              <span className="font-semibold text-gray-900">{stats.currentTerm}</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Your Role</span>
              <span className="font-semibold text-gray-900 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600">System Status</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                Online
              </span>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-xs text-blue-700 mb-3">
              Check out our user guide or contact support for assistance.
            </p>
            <button className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              View User Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;