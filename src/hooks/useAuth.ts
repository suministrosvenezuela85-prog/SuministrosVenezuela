'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

/**
 * Hook de autenticación con Supabase Auth.
 * Reemplaza el código hardcodeado de admin con autenticación real.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.user_metadata?.role === 'administrador_verificado';

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return false;
    }
    return true;
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    setError('');
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return { user, isAdmin, loading, error, signIn, signUp, signOut, setError };
}
