import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem('demo_mode') === 'true');

  useEffect(() => {
    if (isDemoMode) {
      setUser({ id: 'demo-user', email: 'demo@meuplantao.com' } as any);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const loginWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('demo_mode', 'true');
    setUser({ id: 'demo-user', email: 'demo@meuplantao.com' } as any);
  };

  const logout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      localStorage.removeItem('demo_mode');
      setUser(null);
      return;
    }
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isDemoMode,
      login, 
      loginWithEmail, 
      signUpWithEmail, 
      enterDemoMode,
      logout, 
      isConfigured: isSupabaseConfigured 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
