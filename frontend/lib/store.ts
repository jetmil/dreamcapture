import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Dream, Moment, authAPI } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const currentState = get();

        // No token - user not logged in, nothing to check
        if (!currentState.token) {
          return;
        }

        // Already authenticated and have user data
        if (currentState.user && currentState.isAuthenticated) {
          return;
        }

        // Have token but no user data - verify and fetch
        set({ isLoading: true });
        try {
          const userRes = await authAPI.me();
          set({
            user: userRes.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Token expired or invalid, clear everything
          console.error('Token validation failed, clearing auth state');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

interface StreamState {
  dreams: Dream[];
  moments: Moment[];
  addDream: (dream: Dream) => void;
  addMoment: (moment: Moment) => void;
  setDreams: (dreams: Dream[]) => void;
  setMoments: (moments: Moment[]) => void;
  clearExpired: () => void;
}

export const useStreamStore = create<StreamState>((set, get) => ({
  dreams: [],
  moments: [],

  addDream: (dream) =>
    set((state) => ({
      dreams: [dream, ...state.dreams].slice(0, 50),
    })),

  addMoment: (moment) =>
    set((state) => ({
      moments: [moment, ...state.moments].slice(0, 50),
    })),

  setDreams: (dreams) => set({ dreams }),

  setMoments: (moments) => set({ moments }),

  clearExpired: () => {
    const now = new Date().toISOString();
    set((state) => ({
      moments: state.moments.filter((m) => m.expires_at > now),
      dreams: state.dreams.filter((d) => d.expires_at > now),
    }));
  },
}));
