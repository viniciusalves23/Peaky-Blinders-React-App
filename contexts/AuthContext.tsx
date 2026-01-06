
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

interface AuthResponse {
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  requestPasswordReset: (email: string) => Promise<AuthResponse>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<AuthResponse>;
  verifyEmailOtp: (email: string, code: string) => Promise<AuthResponse>;
  updateUserPassword: (password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: any) => {
    if (!sessionUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    const profile = await api.getUserProfile(sessionUser.id);
    if (profile) {
      setUser(profile);
    } else {
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || 'Usuário',
        role: 'customer',
        loyaltyStamps: 0,
        isAdmin: false
      });
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    fetchProfile(session?.user);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchProfile(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        return { success: false, message: "Email não confirmado. Use o código enviado." };
      }
      if (error.message.includes("Invalid login credentials")) {
        const exists = await api.checkUserExists(email);
        if (!exists) {
          return { success: false, message: "Email não cadastrado." };
        } else {
          return { success: false, message: "Senha incorreta." };
        }
      }
      return { success: false, message: "Erro ao realizar login." };
    }
    return { success: true };
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const exists = await api.checkUserExists(email);
    if (exists) {
        return { success: false, message: "Este e-mail já está cadastrado." };
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        // O Supabase enviará o template "Confirm Email". Se configurado para {{ .Token }}, enviará o código.
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    // Se o usuário foi criado, mas não tem sessão, significa que precisa confirmar email
    if (data.user && !data.session) {
        return { success: true, message: "CONFIRM_EMAIL" };
    }

    return { success: true };
  };

  // Função nova para verificar OTP de cadastro
  const verifyEmailOtp = async (email: string, code: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
    });

    if (error) {
        return { success: false, message: "Código inválido ou expirado." };
    }

    if (data.session) {
        return { success: true };
    }
    
    return { success: false, message: "Não foi possível iniciar a sessão." };
  };

  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    const exists = await api.checkUserExists(email);
    if (!exists) {
        return { success: false, message: "Não existe conta com este e-mail cadastrado." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  const verifyPasswordResetCode = async (email: string, code: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery'
    });

    if (error) {
        return { success: false, message: "Código inválido ou expirado." };
    }

    return { success: true };
  };

  const updateUserPassword = async (password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      refreshUser, 
      loading,
      requestPasswordReset,
      verifyPasswordResetCode,
      verifyEmailOtp,
      updateUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
