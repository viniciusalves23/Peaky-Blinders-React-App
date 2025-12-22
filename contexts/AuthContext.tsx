
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';
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
    const profile = await db.getUserProfile(sessionUser.id);
    if (profile) {
      setUser(profile);
    } else {
      // Fallback para usuário recém criado (delay do trigger)
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
    // 1. Verificar sessão ativa ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user);
    });

    // 2. Escutar mudanças de autenticação (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchProfile(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        // Evento disparado quando o usuário clica no link de reset de senha
        // Não fazemos nada aqui, a rota /update-password cuidará disso
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("Login error:", error.message);
      if (error.message.includes("Email not confirmed")) {
        return { success: false, message: "Email não confirmado. Verifique sua caixa de entrada." };
      }
      if (error.message.includes("Invalid login credentials")) {
        // Supabase retorna a mesma mensagem para email não existe ou senha errada por segurança
        // Vamos tentar verificar se o email existe na tabela publica de profiles para dar msg mais precisa
        // NOTA: Isso depende da política de RLS permitir leitura pública (está 'true' no SQL atual)
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
        
        if (!profile) {
          return { success: false, message: "Email não cadastrado." };
        } else {
          return { success: false, message: "Senha inválida." };
        }
      }
      return { success: false, message: "Erro ao realizar login. Tente novamente." };
    }
    
    return { success: true };
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    // Verificar se já existe para dar mensagem personalizada
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (existing) {
        return { success: false, message: "Este e-mail já está cadastrado." };
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // Metadata para o Trigger criar o Profile
        // Importante para HashRouter: definir para onde redirecionar após confirmar email
        emailRedirectTo: `${window.location.origin}/#/login`
      }
    });

    if (error) {
      return { success: false, message: error.message };
    }

    // Se o registro foi bem sucedido e requires email confirmation (padrão Supabase)
    if (data.user && !data.session) {
        return { success: true, message: "CONFIRM_EMAIL" };
    }

    return { success: true };
  };

  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    // 1. Verificar se o email existe na base antes de enviar
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
    
    if (!profile) {
        return { success: false, message: "Não existe conta com este e-mail cadastrado." };
    }

    // 2. Enviar email de recuperação
    // Para HashRouter, precisamos construir a URL com o hash
    const redirectTo = `${window.location.origin}/#/update-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });

    if (error) {
      return { success: false, message: error.message };
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
