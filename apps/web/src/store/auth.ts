import { create } from 'zustand';
import { api } from '../lib/api';
import { setAuthToken, clearAuthToken, getAuthToken } from '../lib/auth';
import { saveUser } from '../lib/db';
import type { User } from '@vklube/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  fetchMe: () => Promise<void>;
  devLogin: (username: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  fetchMe: async () => {
    if (!getAuthToken()) {
      set({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const user = await api.get<User>('/auth/me');
      await saveUser(user);
      set({ user, isLoading: false, isAuthenticated: true });
    } catch {
      set({ user: null, isLoading: false, isAuthenticated: false });
    }
  },

  devLogin: async (username: string, displayName?: string) => {
    const user = await api.post<User>('/auth/dev-login', {
      username,
      display_name: displayName,
    });
    setAuthToken(username);
    await saveUser(user);
    set({ user, isLoading: false, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors
    }
    clearAuthToken();
    set({ user: null, isLoading: false, isAuthenticated: false });
  },
}));
