
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Eye, EyeOff, Mail, CheckCircle2, User, Lock, ArrowRight, Timer, AlertTriangle } from 'lucide-react';

export const Register: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const { register, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();

  // Timer Effect para reenvio
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      if (result.message === 'CONFIRM_EMAIL') {
        setStep(2);
        setResendTimer(60);
      } else {
        // Caso a confirmação de email esteja desligada no Supabase, loga direto
        alert('Conta criada com sucesso!');
        navigate('/');
      }
    } else {
      setError(result.message || 'Erro ao criar conta.');
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
        // Sucesso: Sessão criada, redireciona para Home
        alert('Bem-vindo à família Peaky Blinders!');
        navigate('/');
    } else {
        setError(result.message || 'Código inválido ou expirado.');
    }
  };

  const handleResend = async () => {
      if (resendTimer > 0) return;
      setLoading(true);
      // Chamamos register novamente com os mesmos dados para reenviar o email de confirmação
      const result = await register(name, email, password);
      setLoading(false);
      
      if (result.success) {
          setResendTimer(60);
          alert('Código reenviado para seu e-mail.');
      } else {
          setError(result.message || 'Erro ao reenviar código.');
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
                 required
                 autoFocus
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
                 required
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
                required
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
              disabled={loading} 
              type="submit" 
              className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <span className="animate-pulse">Processando...</span> : <>Continuar <ArrowRight size={18}/></>}
            </button>

            <p className="text-center text-zinc-500 text-xs mt-4">
               Já tem uma conta? <Link to="/login" className="text-gold-600 font-bold hover:underline">Entrar</Link>
            </p>
          </form>
        )}

        {/* STEP 2: VALIDAÇÃO OTP */}
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
               {loading ? <span className="animate-pulse">Verificando...</span> : <>Confirmar e Entrar <CheckCircle2 size={18}/></>}
             </button>

             <div className="text-center pt-2">
                <button 
                    type="button"
                    onClick={handleResend}
                    disabled={resendTimer > 0}
                    className={`text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 mx-auto transition-colors ${resendTimer > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-gold-600 hover:text-gold-500 cursor-pointer'}`}
                >
                    {resendTimer > 0 ? (
                        <><Timer size={12} /> Reenviar em {resendTimer}s</>
                    ) : (
                        "Reenviar Código"
                    )}
                </button>
                <button type="button" onClick={() => setStep(1)} className="mt-4 text-[10px] text-zinc-500 underline">Corrigir e-mail</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
