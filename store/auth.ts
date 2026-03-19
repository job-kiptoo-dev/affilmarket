import { getSession, signOut } from '@/lib/utils/auth-client';
import { create } from 'zustand';
// import { signOut, getSession } from '@/lib/healpers/auth-client';

interface User {
  id:     string;
  email:  string;
  name:   string;
  role:   string;
  status: string;
}

interface AuthState {
  user:      User | null;
  isLoading: boolean;
  setUser:   (user: User | null) => void;
  fetchUser: () => Promise<User | null>;
  logout:    () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:      null,
  isLoading: true,

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    try {
      const session = await getSession();
      const user = session?.data?.user as any;
      if (user) {
        const u = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
        set({ user: u, isLoading: false });
        return u;
      } else {
        set({ user: null, isLoading: false });
        return null;
      }
    } catch {
      set({ user: null, isLoading: false });
      return null;
    }
  },

  logout: async () => {
    await signOut();
    set({ user: null });
    window.location.href = '/';
  },
}));
