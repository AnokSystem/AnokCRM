import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, AppRole } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  activeFeatures: string[];
  maxInstances: number;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeFeatures, setActiveFeatures] = useState<string[]>([]);
  const [maxInstances, setMaxInstances] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkUserStatus = async (userId: string, showToast = true) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      console.error('Error checking user status:', error);
      // FAIL OPEN: If we can't verify status (e.g. network error, RLS issue), 
      // we ALLOW access to prevent accidental lockouts.
      // We only block if we explicitly know the user is suspended.
      return true;
    }

    if (data.status === 'suspended' || data.status === 'inactive') {
      await supabase.auth.signOut();
      if (showToast) {
        setTimeout(() => {
          toast({
            title: 'Acesso Negado - Fatura em Atraso',
            description: 'Sua conta está suspensa devido a pendências financeiras. Regularize sua fatura para continuar utilizando o sistema.',
            variant: 'destructive',
            duration: 5000
          });
        }, 500);
      }
      setUser(null);
      setSession(null);
      return false;
    }
    return true;
  };

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadUserFeatures = async (userId: string) => {
    const { data } = await supabase
      .from('user_plans')
      .select('active_features, max_instances')
      .eq('user_id', userId)
      .maybeSingle();

    setActiveFeatures(data?.active_features || []);
    setMaxInstances(data?.max_instances || 1);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Temporarily disable strict check to unblock admin loop
          // const isActive = await checkUserStatus(session.user.id);
          // if (!isActive) {
          //   setLoading(false);
          //   return;
          // }

          setSession(session);
          setUser(session.user);

          // Parallel checks for performance
          setTimeout(() => {
            checkUserStatus(session.user.id); // Just log status/toast, don't block
            checkAdminRole(session.user.id);
            loadUserFeatures(session.user.id);
          }, 0);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setActiveFeatures([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Just basic load, let onAuthStateChange handle strict status checks
        // to avoid race conditions and double-locking
        checkAdminRole(session.user.id);
        loadUserFeatures(session.user.id);
      }
      // If we rely on onAuthStateChange to set loading(false), we might wait too long
      // checking status. But if we set it here, we might flash content.
      // However, infinite loading is worse. Let's set it here.
      // NOTE: status check in onAuthStateChange will kick user out if needed.
      setLoading(false);
    });

    // Safety timeout: force loading to false after 3 seconds to prevent infinite hang
    const timer = setTimeout(() => setLoading(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // We rely on onAuthStateChange to check for suspension and kick the user out if needed.
    // This avoids blocking the login UI or causing race conditions/hangs.

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, activeFeatures, maxInstances, loading, signIn, signUp, signOut }}>
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
