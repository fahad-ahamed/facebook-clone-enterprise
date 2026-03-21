'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      login: (user, accessToken, refreshToken) => set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      }),

      logout: () => {
        // Clear tokens from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...updates } });
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false);
      },
    }
  )
);

// Hook for handling authentication
export function useAuth() {
  const store = useAuthStore();

  const checkAuth = async () => {
    try {
      const { accessToken } = store;
      if (!accessToken) {
        store.setLoading(false);
        return;
      }

      // Verify token and fetch user
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        store.setUser(userData.user);
      } else {
        store.logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      store.logout();
    } finally {
      store.setLoading(false);
    }
  };

  const refreshTokens = async () => {
    try {
      const { refreshToken } = store;
      if (!refreshToken) {
        store.logout();
        return false;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        store.setTokens(data.accessToken, data.refreshToken);
        return true;
      } else {
        store.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      store.logout();
      return false;
    }
  };

  return {
    ...store,
    checkAuth,
    refreshTokens,
  };
}
