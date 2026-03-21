// Authentication hook
// Handles user login state and auth actions

import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/api';
import type { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.user) {
        setUser(response.user as User);
      }
    } catch (error) {
      // Not logged in, that's fine
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      if (response.user) {
        setUser(response.user as User);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await checkAuth();
  }, [checkAuth]);

  return { user, loading, login, logout, refresh };
}
