import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from '../lib/api';
import type { User } from '../types';

type AuthContextValue = { user: User | null; loading: boolean; login: (phone: string, password: string) => Promise<void>; logout: () => Promise<void>; can: (...permissions: string[]) => boolean };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet<{ user: User }>('/auth/me').then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false)); const clear = () => setUser(null); window.addEventListener('pharmacy:unauthorized', clear); return () => window.removeEventListener('pharmacy:unauthorized', clear); }, []);
  const login = async (phone: string, password: string) => { const result = await apiPost<{ user: User }>('/auth/login', { phone, password }); setUser(result.user); };
  const logout = async () => { try { await apiPost('/auth/logout'); } finally { setUser(null); } };
  const can = (...permissions: string[]) => !!user && (user.permissions.includes('*') || permissions.some((permission) => user.permissions.includes(permission)));
  return <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
