import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const LOCAL_MODE_STORAGE_KEY = 'tradeflow_local_mode';

export const MOCK_LOCAL_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  app_metadata: { provider: 'local' },
  user_metadata: { name: 'Local Trader' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'local@tradeflow.app',
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  loginAsLocalUser: () => void;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  loginAsLocalUser: () => {},
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
});

function getCachedSession(): { user: User | null; session: Session | null } {
  try {
    if (typeof window === 'undefined') return { user: null, session: null };
    if (localStorage.getItem(LOCAL_MODE_STORAGE_KEY) === 'true') {
      return { user: MOCK_LOCAL_USER, session: null };
    }
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
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.hash.includes('type=recovery');
    }
    return false;
  });

  useEffect(() => {
    // Verify & refresh session in background
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsLoading(false);
      } else {
        const isLocal = typeof window !== 'undefined' && localStorage.getItem(LOCAL_MODE_STORAGE_KEY) === 'true';
        if (isLocal) {
          setUser(MOCK_LOCAL_USER);
          setSession(null);
        } else {
          setUser(null);
          setSession(null);
        }
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
        if (session) {
          try { localStorage.removeItem(LOCAL_MODE_STORAGE_KEY); } catch (_) {}
          setSession(session);
          setUser(session.user);
          setIsLoading(false);
        } else {
          const isLocal = typeof window !== 'undefined' && localStorage.getItem(LOCAL_MODE_STORAGE_KEY) === 'true';
          if (!isLocal) {
            setSession(null);
            setUser(null);
          }
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loginAsLocalUser = () => {
    try {
      localStorage.setItem(LOCAL_MODE_STORAGE_KEY, 'true');
    } catch (_) {}
    setUser(MOCK_LOCAL_USER);
    setSession(null);
    setIsLoading(false);
  };

  const signOut = async () => {
    try {
      localStorage.removeItem(LOCAL_MODE_STORAGE_KEY);
    } catch (_) {}
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut, loginAsLocalUser, isPasswordRecovery, setIsPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
