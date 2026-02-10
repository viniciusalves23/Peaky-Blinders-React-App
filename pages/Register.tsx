
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link, useLocation } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ChevronLeft, Eye, EyeOff, Mail, CheckCircle2, User, Lock, ArrowRight, Timer, AlertTriangle, AtSign, Phone, Loader2, Check, X } from 'lucide-react';
import { api } from '../services/api';

export const Register: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Real-time Username Validation State
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const { register, verifyEmailOtp, resendVerification } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica se veio do login com email não confirmado
  useEffect(() => {
      if (location.state?.email && location.state?.step === 2) {
          setEmail(location.state.email);
          setStep(2);
          
          if (location.state?.autoResend) {
              const doResend = async () => {
                  setLoading(true);
                  // Reseta o estado de navegação para não re-disparar ao atualizar a página
                  window.history.replaceState({}, document.title);
                  
                  await resendVerification(location.state.email);
                  setLoading(false);
                  setResendTimer(60);
                  addToast("Novo código enviado para seu e-mail.", "info");
              };
              doResend();
          }
      }
  }, []);

  // Timer Effect para reenvio de código
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Real-time Username Check with Debounce
  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');
      try {
        const exists = await api.checkUsernameExists(username);
        setUsernameStatus(exists ? 'taken' : 'available');
      } catch (err) {
        setUsernameStatus('idle'); // Falha silenciosa ou tratar erro
      }
    };

    const timeoutId = setTimeout(() => {
      checkUsername();
    }, 800); // 800ms debounce

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Força minúsculo e remove espaços/caracteres especiais
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    setUsername(val);
    if (usernameStatus !== 'idle') setUsernameStatus('idle'); // Reset status while typing
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     // Permite apenas numeros e limita a 11 digitos
     const val = e.target.value.replace(/\D/g, '').slice(0, 11);
     setPhone(val);
  };

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 1. Validação de Campos Vazios
    if (!name.trim()) { setError('O campo Nome é obrigatório.'); return; }
    if (!username.trim()) { setError('O campo Usuário é obrigatório.'); return; }
    if (!phone.trim()) { setError('O campo Celular é obrigatório.'); return; }
    if (!email.trim()) { setError('O campo E-mail é obrigatório.'); return; }
    if (!password) { setError('O campo Senha é obrigatório.'); return; }

    // 2. Validação de Formatos
    if (username.length < 3) {
      setError('O usuário deve ter pelo menos 3 caracteres.');
      return;
    }
    
    if (usernameStatus === 'taken') {
        setError('Este nome de usuário já está em uso. Escolha outro.');
        return;
    }

    if (usernameStatus === 'checking') {
        setError('Aguarde a verificação do nome de usuário.');
        return;
    }

    // VALIDAÇÃO ESTRITA DE CELULAR BR (11 Digitos, começando com 9 após DDD)
    if (phone.length !== 11) {
        setError('O celular deve ter 11 dígitos (DDD + 9 + número).');
        return;
    }

    // Verifica se o terceiro dígito (índice 2) é 9. Ex: 11 9...
    if (phone.substring(2, 3) !== '9') {
        setError('Número inválido. Celulares no Brasil devem começar com o dígito 9 após o DDD.');
        return;
    }

    if (!validateEmail(email)) {
        setError('Por favor, insira um endereço de e-mail válido.');
        return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    // Note: register doesn't take phone yet in params, we need to update profile AFTER auth
    const result = await register(name, email, username, password);
    setLoading(false);

    if (result.success) {
      if (result.message === 'CONFIRM_EMAIL') {
        setStep(2);
        setResendTimer(60);
        addToast('Código enviado para seu e-mail.', 'info');
      } else {
        // Se entrou direto (caso raro no Supabase com confirm off)
        localStorage.setItem('temp_reg_phone', phone);
        
        const pendingBooking = sessionStorage.getItem('pending_booking');
        if (pendingBooking) {
            navigate('/book');
        } else {
            navigate('/');
        }
      }
    } else {
      setError(result.message || 'Erro ao criar conta.');
      addToast(result.message || 'Erro ao criar conta.', 'error');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length < 6) {
        setError('O código está incompleto.');
        return;
    }

    setLoading(true);
    const result = await verifyEmailOtp(email, code);
    setLoading(false);

    if (result.success) {
        if (phone) localStorage.setItem('pending_phone_update', phone);
        
        // Marca que o redirecionamento inicial foi feito para evitar loops na Home
        sessionStorage.setItem('initial_role_redirect_complete', 'true');

        addToast('Bem-vindo à família Peaky Blinders!', 'success');

        // VERIFICA AGENDAMENTO PENDENTE
        const pendingBooking = sessionStorage.getItem('pending_booking');
        if (pendingBooking) {
            navigate('/book');
        } else {
            navigate('/');
        }
    } else {
        setError(result.message || 'Código inválido ou expirado.');
        addToast('Código inválido ou expirado.', 'error');
    }
  };

  const handleResend = async () => {
      if (resendTimer > 0) return;
      
      setLoading(true);
      // Usa a nova função dedicada de resend (apenas email)
      const result = await resendVerification(email);
      setLoading(false);
      
      if (result.success) {
          setResendTimer(60);
          addToast('Código reenviado para seu e-mail.', 'success');
      } else {
          setError(result.message || 'Erro ao reenviar código.');
          addToast(result.message || 'Erro ao reenviar código.', 'error');
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in relative bg-zinc-50 dark:bg-black">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm font-bold uppercase tracking-wider hover:text-gold-600 transition-colors">
        <ChevronLeft size={20} /> Voltar
      </Link>
      
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 flex">
            <div className={`h-full bg-gold-600 transition-all duration-500 ease-out shadow-[0_0_10px_#D4AF37] ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
        </div>

        {/* STEP 1: DADOS CADASTRAIS */}
        {step === 1 && (
          <form onSubmit={handleSubmitDetails} className="space-y-4 animate-slide-in">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600 border border-gold-600/20 shadow-lg">
                    <User size={28} />
                </div>
                <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Criar Conta</h2>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">Junte-se ao clube Peaky Blinders</p>
             </div>

             {error && (
               <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-3 font-bold animate-shake">
                 <AlertTriangle size={16} className="shrink-0" /> {error}
               </div>
             )}
            
            <div className="relative group">
               <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-gold-500 transition-colors"/>
               <input 
                 type="text" 
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pl-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium"
                 placeholder="Nome Completo"
                 // Removido 'required' do HTML para tratar manualmente com mensagens personalizadas
                 autoFocus
               />
            </div>

            <div className="relative group">
               <AtSign size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                   usernameStatus === 'taken' ? 'text-red-500' : 
                   usernameStatus === 'available' ? 'text-green-500' : 'text-zinc-400'
               }`}/>
               <input 
                 type="text" 
                 value={username}
                 onChange={handleUsernameChange}
                 className={`w-full bg-zinc-50 dark:bg-black border rounded-xl p-4 pl-12 pr-12 text-zinc-900 dark:text-white outline-none transition-all placeholder:text-zinc-400 font-medium ${
                    usernameStatus === 'taken' 
                        ? 'border-red-500 focus:border-red-600' 
                        : usernameStatus === 'available' 
                            ? 'border-green-500 focus:border-green-600' 
                            : 'border-zinc-200 dark:border-zinc-800 focus:border-gold-500'
                 }`}
                 placeholder="usuario_unico"
               />
               
               {/* Feedback Icon Right */}
               <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                   {usernameStatus === 'checking' && <Loader2 size={18} className="text-gold-600 animate-spin" />}
                   {usernameStatus === 'available' && <Check size={18} className="text-green-500" />}
                   {usernameStatus === 'taken' && <X size={18} className="text-red-500" />}
               </div>
            </div>
            
            {usernameStatus === 'taken' && (
                <p className="text-[10px] text-red-500 font-bold pl-2 -mt-2">Usuário indisponível.</p>
            )}
            
            <div className="relative group">
               <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-gold-500 transition-colors"/>
               <input 
                 type="tel" 
                 value={phone}
                 onChange={handlePhoneChange}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pl-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium"
                 placeholder="Celular (11 9xxxx-xxxx)"
                 maxLength={11}
               />
            </div>

            <div className="relative group">
               <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-gold-500 transition-colors"/>
               <input 
                 type="email" 
                 value={email}
                 onChange={e => setEmail(e.target.value)}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pl-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium"
                 placeholder="Seu melhor e-mail"
               />
            </div>

            <div className="relative group">
               <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-gold-500 transition-colors"/>
               <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pl-12 pr-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium"
                placeholder="Senha (mín. 6 dígitos)"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-gold-500 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button 
              disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken'} 
              type="submit" 
              className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 disabled:cursor-not-allowed"
            >
              {loading ? <span className="animate-pulse">Processando...</span> : <>Continuar <ArrowRight size={18}/></>}
            </button>

            <p className="text-center text-zinc-500 text-xs mt-4">
               Já tem uma conta? <Link to="/login" className="text-gold-600 font-bold hover:underline">Entrar</Link>
            </p>
          </form>
        )}

        {/* STEP 2: VALIDAÇÃO OTP (Mantido igual) */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6 animate-slide-in">
             <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600 border border-gold-600/20 shadow-lg">
                    <CheckCircle2 size={28} />
                </div>
                <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Confirme seu E-mail</h2>
                <p className="text-xs text-zinc-500 mt-1">
                   Enviamos um código para <span className="text-gold-600 font-bold underline decoration-dotted">{email}</span>
                </p>
             </div>

             {error && (
               <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-3 font-bold animate-shake">
                 <AlertTriangle size={16} className="shrink-0" /> {error}
               </div>
             )}

             <div className="relative">
                <input 
                  type="text" 
                  value={code} 
                  onChange={e => setCode(e.target.value.trim().slice(0, 8))} 
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center text-3xl tracking-[0.2em] font-mono font-bold text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:tracking-normal placeholder:text-zinc-300 placeholder:text-sm" 
                  placeholder="Código"
                  maxLength={8}
                  required 
                  autoFocus
                />
             </div>

             <button 
               disabled={loading} 
               type="submit" 
               className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {loading ? <span className="animate-pulse">Validando...</span> : <>Confirmar <CheckCircle2 size={18}/></>}
             </button>

             <div className="text-center pt-2">
                <button 
                    type="button"
                    onClick={() => resendTimer === 0 && handleResend()}
                    disabled={resendTimer > 0}
                    className={`text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 mx-auto transition-colors ${resendTimer > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-gold-600 hover:text-gold-500 cursor-pointer'}`}
                >
                    {resendTimer > 0 ? (
                        <><Timer size={12} /> Reenviar em {resendTimer}s</>
                    ) : (
                        "Reenviar Código"
                    )}
                </button>
             </div>
          </form>
        )}
      </div>
    </div>
  );
};
