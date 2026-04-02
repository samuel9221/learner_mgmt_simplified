// ============================================================================
// AUTHENTICATION STORE
// Global state management for authentication using Zustand
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/auth/login`, credentials);
          
          if (response.data.success) {
            const { user, accessToken, refreshToken } = response.data.data;
            
            // Store in localStorage
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            
            set({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            return { success: true };
          }
          
          return { success: false, message: response.data.message };
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
          });
          return { success: false, message: errorMessage };
        }
      },

      logout: async () => {
        try {
          // Optional: Call logout endpoint
          await axios.post(`${API_URL}/auth/logout`);
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear everything
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      updateUser: async () => {
        try {
          const token = get().accessToken;
          const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data.success) {
            set({ user: response.data.data });
          }
        } catch (error) {
          console.error('Failed to update user:', error);
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      getRole: () => {
        return get().user?.role || null;
      },

      isSuperAdmin: () => {
        return get().user?.role === 'super_admin';
      },

      isAdmin: () => {
        const role = get().user?.role;
        return role === 'admin' || role === 'super_admin';
      },

      isTeacher: () => {
        return get().user?.role === 'teacher';
      },

      hasRole: (role) => {
        const userRole = get().user?.role;
        
        const roleHierarchy = {
          super_admin: 3,
          admin: 2,
          teacher: 1,
        };
        
        return roleHierarchy[userRole] >= roleHierarchy[role];
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);