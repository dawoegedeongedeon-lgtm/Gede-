import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '../types';

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<UserProfile>;
  register: (email: string, name: string, password: string, confirmPassword?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string, confirmPassword?: string) => Promise<{ success: boolean; message: string }>;
  googleLogin: (email: string, name?: string) => Promise<UserProfile>;
  refreshUser: () => Promise<UserProfile | null>;
  clearError: () => void;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Fetches the current authenticated user from /api/auth/me
   */
  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include', // Sends HttpOnly cookie
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch (err: any) {
      console.error('[AuthContext] refreshUser error:', err?.message);
      setUser(null);
      return null;
    }
  }, []);

  // Initial authentication verification on app mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshUser();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  /**
   * User login
   */
  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true): Promise<UserProfile> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Identifiants invalides. Veuillez vérifier votre e-mail et mot de passe.';
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const message = err.message || 'Erreur lors de la connexion.';
      setAuthError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * User registration
   */
  const register = useCallback(async (email: string, name: string, password: string, confirmPassword?: string): Promise<UserProfile> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Erreur lors de la création du compte.';
        setAuthError(errMsg);
        throw new Error(errMsg);
      }

      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const message = err.message || 'Erreur lors de l\'inscription.';
      setAuthError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * User logout
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
    } catch (err) {
      console.error('[AuthContext] logout error:', err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  /**
   * Password reset
   */
  const resetPassword = useCallback(async (email: string, newPassword: string, confirmPassword?: string): Promise<{ success: boolean; message: string }> => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de réinitialiser le mot de passe.');
      }

      return {
        success: true,
        message: data.message || 'Mot de passe mis à jour avec succès.',
      };
    } catch (err: any) {
      const message = err.message || 'Erreur lors de la réinitialisation.';
      setAuthError(message);
      throw err;
    }
  }, []);

  /**
   * Google login SSO
   */
  const googleLogin = useCallback(async (email: string, name?: string): Promise<UserProfile> => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const cleanEmail = email.trim();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: cleanEmail,
          name: name?.trim() || cleanEmail.split('@')[0],
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l\'authentification Google.');
      }

      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const message = err.message || 'Erreur lors de la connexion Google.';
      setAuthError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        authError,
        login,
        register,
        logout,
        resetPassword,
        googleLogin,
        refreshUser,
        clearError,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
