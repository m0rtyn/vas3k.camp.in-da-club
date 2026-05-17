import { create } from 'zustand';
import { api } from '../lib/api';
import { saveUser, clearAllLocalData } from '../lib/db';
import type { User } from '@vklube/shared';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  fetchMe: () => Promise<void>;
  devLogin: (username: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function clearApiCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await Promise.all([
      caches.delete('api-cache'),
      caches.delete('pages-cache'),
    ]);
  } catch {
    /* ignore */
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  fetchMe: async () => {
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
    await saveUser(user);
    set({ user, isLoading: false, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    await clearApiCache();
    try {
      await clearAllLocalData();
    } catch {
      /* ignore */
    }
    set({ user: null, isLoading: false, isAuthenticated: false });
  },
}));
