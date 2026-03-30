
import { User } from '../types';

// Demo credentials — replace with your own before deploying.
// For production, integrate a proper auth provider (e.g. Supabase Auth, Auth0).
const DEMO_USERS: { username: string; password: string; user: User }[] = [
  {
    username: 'admin',
    password: 'changeme',
    user: {
      username: 'admin',
      name: 'Parent 1',
      role: 'Admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=c0aede',
    },
  },
  {
    username: 'parent2',
    password: 'changeme',
    user: {
      username: 'parent2',
      name: 'Parent 2',
      role: 'Admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent2&hair=long&backgroundColor=ffdfbf',
    },
  },
];

export const login = (username: string, password: string): Promise<User | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const match = DEMO_USERS.find(
        (u) => u.username === username && u.password === password
      );
      resolve(match ? match.user : null);
    }, 800);
  });
};

export const checkSession = (): User | null => {
  const stored = localStorage.getItem('user_session');
  return stored ? JSON.parse(stored) : null;
};

export const logout = () => {
  localStorage.removeItem('user_session');
};
