import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse } from '../types';
import api from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post<AuthResponse>('/auth/login', { email, password });
        const { access_token, user } = res.data;
        localStorage.setItem('access_token', access_token);
        set({ user, token: access_token, isAuthenticated: true });
      },

      register: async (data) => {
        const res = await api.post<AuthResponse>('/auth/register', data);
        const { access_token, user } = res.data;
        localStorage.setItem('access_token', access_token);
        set({ user, token: access_token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (u) => set((state) => ({ user: state.user ? { ...state.user, ...u } : null })),
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
