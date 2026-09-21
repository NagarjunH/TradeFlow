import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
});

function getCachedSession(): { user: User | null; session: Session | null } {
  try {
    if (typeof window === 'undefined') return { user: null, session: null };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.endsWith('-auth-token') || key.includes('supabase.auth.token'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sess = parsed?.currentSession || parsed;
          if (sess && sess.user && sess.access_token) {
            return { user: sess.user, session: sess };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AuthContext] Cache parse error:', err);
  }
  return { user: null, session: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cached = getCachedSession();
  const [user, setUser] = useState<User | null>(cached.user);
  const [session, setSession] = useState<Session | null>(cached.session);
  const [isLoading, setIsLoading] = useState(!cached.user);

  useEffect(() => {
    // Verify & refresh session in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
