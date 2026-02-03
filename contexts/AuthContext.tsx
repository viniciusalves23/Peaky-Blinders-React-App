
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';

interface AuthResponse {
  success: boolean;
  message?: string;
  role?: string; // Adicionado para permitir redirecionamento
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, username: string, password: string) => Promise<AuthResponse>;
  requestPasswordReset: (identifier: string) => Promise<AuthResponse>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<AuthResponse>;
  verifyEmailOtp: (email: string, code: string) => Promise<AuthResponse>;
  updateUserPassword: (password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper para traduzir erros do Supabase e garantir mensagens amigáveis
const translateAuthError = (errorMsg: string): string => {
  if (!errorMsg) return "Ocorreu um erro desconhecido.";
  
  const msg = errorMsg.toLowerCase();

  // Mapeamento de Erros Comuns
  if (msg.includes("new password should be different from the old password")) 
    return "A nova senha deve ser diferente da anterior.";
  
  if (msg.includes("password should be at least 6 characters")) 
    return "A senha deve ter no mínimo 6 caracteres.";
    
  if (msg.includes("invalid login credentials")) 
    return "Credenciais incorretas.";
    
  if (msg.includes("email not confirmed")) 
    return "E-mail não confirmado. Verifique sua caixa de entrada.";
    
  if (msg.includes("user already registered") || msg.includes("unique constraint")) 
    return "Este e-mail ou usuário já está cadastrado.";
    
  if (msg.includes("rate limit") || msg.includes("too many requests")) 
    return "Muitas tentativas. Aguarde um momento antes de tentar novamente.";
    
  if (msg.includes("token has expired") || msg.includes("invalid token") || msg.includes("code expired")) 
    return "O código ou link expirou ou é inválido.";

  if (msg.includes("weak password"))
    return "A senha escolhida é muito fraca.";

  // Fallback Seguro
  console.error("Erro Técnico (Supabase/App):", errorMsg); 
  return "Não foi possível realizar a operação. Tente novamente mais tarde.";
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Recupera sessão manual se existir
  useEffect(() => {
      const manualUser = localStorage.getItem('peaky_manual_user');
      if (manualUser) {
          try {
              setUser(JSON.parse(manualUser));
              setLoading(false);
              return; // Pula check do supabase se tiver sessão manual
          } catch(e) {
              localStorage.removeItem('peaky_manual_user');
          }
      }
      
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetchProfile(session?.user);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchProfile(session?.user);
        } else if (event === 'SIGNED_OUT') {
          // Só limpa se não for manual (caso use logout manual, ele deve limpar storage)
          if (!localStorage.getItem('peaky_manual_user')) {
              setUser(null);
              setLoading(false);
          }
        }
      });

      return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (sessionUser: any) => {
    if (!sessionUser) {
      // Verifica se não estamos em modo manual antes de limpar
      if (!localStorage.getItem('peaky_manual_user')) {
          setUser(null);
      }
      setLoading(false);
      return;
    }
    const profile = await api.getUserProfile(sessionUser.id);
    if (profile) {
      setUser(profile);
    } else {
      // Fallback enquanto o profile é criado pelo trigger
      setUser({
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.user_metadata?.name || 'Usuário',
        username: sessionUser.user_metadata?.username, // Pega do metadata se profile ainda não carregou
        role: 'customer',
        loyaltyStamps: 0,
        isAdmin: false
      });
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    // Se for manual, recarrega do banco
    const manualData = localStorage.getItem('peaky_manual_user');
    if (manualData) {
        const currentUser = JSON.parse(manualData);
        const fresh = await api.getUserProfile(currentUser.id);
        if (fresh) {
            setUser(fresh);
            localStorage.setItem('peaky_manual_user', JSON.stringify(fresh));
        }
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    fetchProfile(session?.user);
  };

  const login = async (identifier: string, password: string): Promise<AuthResponse> => {
    // 1. Tentativa via Supabase Auth (Padrão)
    let email = identifier;
    let isUsername = !identifier.includes('@');

    if (isUsername) {
      const resolvedEmail = await api.getEmailByUsername(identifier);
      if (resolvedEmail) email = resolvedEmail;
      // Se não achou email, talvez seja um usuário puramente manual criado pelo admin
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.session) {
      // Busca o profile imediatamente para saber o role
      const profile = await api.getUserProfile(data.session.user.id);
      return { success: true, role: profile?.role || 'customer' };
    }

    // 2. FALLBACK: Tenta login manual (tabela profiles -> legacy_password)
    // Isso serve para usuários criados pelo admin que não têm conta Auth ainda.
    const manualProfile = await api.verifyLegacyLogin(identifier, password);
    
    if (manualProfile) {
        setUser(manualProfile);
        // Persiste sessão simples
        localStorage.setItem('peaky_manual_user', JSON.stringify(manualProfile));
        return { success: true, role: manualProfile.role };
    }

    // Se falhar ambos
    if (error) {
      return { success: false, message: translateAuthError(error.message) };
    }
    
    return { success: false, message: "Credenciais inválidas." };
  };

  const register = async (name: string, email: string, username: string, password: string): Promise<AuthResponse> => {
    // 1. Verifica E-mail
    const emailExists = await api.checkUserExists(email);
    if (emailExists) {
        return { success: false, message: "Este e-mail já está cadastrado." };
    }

    // 2. Verifica Username
    const usernameExists = await api.checkUsernameExists(username);
    if (usernameExists) {
        return { success: false, message: "Nome de usuário já está em uso. Escolha outro." };
    }

    // 3. Cria Usuário
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, username }, // Passa username no metadata para trigger
      }
    });

    if (error) {
      return { success: false, message: translateAuthError(error.message) };
    }

    if (data.user && !data.session) {
        return { success: true, message: "CONFIRM_EMAIL" };
    }

    return { success: true };
  };

  const verifyEmailOtp = async (email: string, code: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
    });

    if (error) {
        return { success: false, message: translateAuthError(error.message) };
    }

    if (data.session) {
        return { success: true };
    }
    
    return { success: false, message: "Não foi possível iniciar a sessão." };
  };

  const requestPasswordReset = async (identifier: string): Promise<AuthResponse> => {
    let email = identifier;

    if (!identifier.includes('@')) {
      const resolvedEmail = await api.getEmailByUsername(identifier);
      if (!resolvedEmail) {
        return { success: false, message: "Nome de usuário não encontrado." };
      }
      email = resolvedEmail;
    } else {
        const exists = await api.checkUserExists(email);
        if (!exists) {
            return { success: false, message: "Não existe conta com este e-mail cadastrado." };
        }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { success: false, message: translateAuthError(error.message) };
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
        return { success: false, message: translateAuthError(error.message) };
    }

    return { success: true };
  };

  const updateUserPassword = async (password: string): Promise<AuthResponse> => {
    // Se for usuário manual, atualiza no profile
    const manualData = localStorage.getItem('peaky_manual_user');
    if (manualData) {
        const currentUser = JSON.parse(manualData);
        try {
            await api.adminResetUserPassword(currentUser.id, password);
            // Atualiza sessão local
            currentUser.legacyPassword = password; // Opcional, apenas para consistência local
            localStorage.setItem('peaky_manual_user', JSON.stringify(currentUser));
            return { success: true };
        } catch (e) {
            return { success: false, message: "Erro ao atualizar senha no banco." };
        }
    }

    // Usuário Auth Padrão
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { success: false, message: translateAuthError(error.message) };
    }

    return { success: true };
  };

  const logout = async () => {
    localStorage.removeItem('peaky_manual_user');
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
