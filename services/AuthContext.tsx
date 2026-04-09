import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  plan: 'free' | 'pro';
  ai_usage_count: number;
  csv_upload_count: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Fetch or create user profile
async function fetchOrCreateProfile(user: User): Promise<UserProfile | null> {
  const fallbackProfile: UserProfile = {
    id: user.id,
    email: user.email || '',
    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    plan: 'free',
    ai_usage_count: 0,
    csv_upload_count: 0,
    created_at: new Date().toISOString(),
  };

  try {
    // Try to fetch existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) return data as UserProfile;

    // Profile doesn't exist — create one
    if (error && error.code === 'PGRST116') {
      const newProfile: Partial<UserProfile> = {
        id: fallbackProfile.id,
        email: fallbackProfile.email,
        display_name: fallbackProfile.display_name,
        avatar_url: fallbackProfile.avatar_url,
        plan: 'free',
        ai_usage_count: 0,
        csv_upload_count: 0,
      };

      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return fallbackProfile;
      }

      return created as UserProfile;
    }

    console.error('Failed to fetch profile:', error);
    // If it's a network error or RLS error, DO NOT log them out. Use fallback.
    return fallbackProfile;
  } catch (err) {
    console.error('Profile fetch error:', err);
    return fallbackProfile;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Explicitly check session on mount (crucial for Strict Mode and new tabs)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOrCreateProfile(session.user).then(p => {
          if (isMounted) setProfile(p);
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const p = await fetchOrCreateProfile(session.user);
          if (isMounted) setProfile(p);
        } else {
          if (isMounted) setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName || email.split('@')[0] },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error during Supabase sign out API call:", err);
    } finally {
      // Force clear state regardless of API success
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Manually wipe Supabase auth tokens from localStorage just in case
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
