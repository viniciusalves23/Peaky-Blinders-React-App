
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ChevronLeft, Mail, AlertTriangle, KeyRound, Lock, Eye, EyeOff, Timer, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { requestPasswordReset, verifyPasswordResetCode, updateUserPassword, logout } = useAuth();
  const { addToast } = useToast();
  
  // Steps: 1 = Email, 2 = Code, 3 = New Password
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form Data
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!email.includes('@')) {
        setError('Digite um e-mail válido.');
        return;
    }

    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setStep(2);
      setResendTimer(60); 
      addToast('Código de recuperação enviado.', 'info');
    } else {
      setError(result.message || 'Erro ao enviar código.');
      addToast('Erro ao enviar código.', 'error');
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
    const result = await verifyPasswordResetCode(email, code);
    setLoading(false);

    if (result.success) {
      setStep(3);
      addToast('Código verificado.', 'success');
    } else {
      setError(result.message || 'Código inválido ou expirado.');
      addToast('Código inválido.', 'error');
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        setError('As senhas não coincidem.');
        return;
    }

    setLoading(true);
    const result = await updateUserPassword(newPassword);
    
    if (result.success) {
        await logout(); 
        setLoading(false);
        addToast('Senha redefinida com sucesso!', 'success');
        navigate('/login');
    } else {
        setLoading(false);
        setError(result.message || 'Erro ao atualizar senha.');
        addToast('Erro ao atualizar senha.', 'error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in relative bg-zinc-50 dark:bg-black">
      <Link to="/login" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm font-bold uppercase tracking-wider hover:text-gold-600 transition-colors">
        <ChevronLeft size={20} /> Voltar
      </Link>
      
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        
        {/* Progress Bar Top */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 flex">
            <div className={`h-full bg-gold-600 transition-all duration-500 ease-out shadow-[0_0_10px_#D4AF37] ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        {/* STEP 1: EMAIL */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-6 animate-slide-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gold-600 border border-gold-600/20 shadow-lg">
                <Mail size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Recuperar Acesso</h2>
              <p className="text-xs text-zinc-500 mt-2 font-medium uppercase tracking-wide">Informe seu e-mail para receber o código.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-3 font-bold animate-shake">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            <div className="relative">
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pl-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium" 
                  placeholder="seu@email.com" 
                  required 
                  autoFocus
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            </div>
            
            <button 
              disabled={loading}
              className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse">Enviando...</span> : <>Enviar Código <ArrowRight size={18}/></>}
            </button>
          </form>
        )}

        {/* STEP 2: CÓDIGO */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6 animate-slide-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gold-600 border border-gold-600/20 shadow-lg">
                <KeyRound size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Código de Segurança</h2>
              <p className="text-xs text-zinc-500 mt-2 font-medium">
                Insira o código enviado para <span className="text-gold-600 font-bold underline decoration-dotted">{email}</span>
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
              className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse">Validando...</span> : <>Validar Código <CheckCircle2 size={18}/></>}
            </button>
            
            <div className="text-center pt-2">
                <button 
                    type="button"
                    onClick={() => resendTimer === 0 && handleSendCode()}
                    disabled={resendTimer > 0}
                    className={`text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 mx-auto transition-colors ${resendTimer > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-gold-600 hover:text-gold-500 cursor-pointer'}`}
                >
                    {resendTimer > 0 ? (
                        <><Timer size={12} /> Reenviar em {resendTimer}s</>
                    ) : (
                        "Reenviar Código"
                    )}
                </button>
                <button type="button" onClick={() => setStep(1)} className="mt-4 text-[10px] text-zinc-500 underline">Trocar e-mail</button>
            </div>
          </form>
        )}

        {/* STEP 3: NOVA SENHA */}
        {step === 3 && (
          <form onSubmit={handleSetNewPassword} className="space-y-6 animate-slide-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-gold-600 border border-gold-600/20 shadow-lg">
                <Lock size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Criar Nova Senha</h2>
              <p className="text-xs text-zinc-500 mt-2 font-medium uppercase tracking-wide">Escolha uma senha forte para sua segurança.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-3 font-bold animate-shake">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
                <div className="relative group">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pr-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium group-hover:border-zinc-300 dark:group-hover:border-zinc-700" 
                        placeholder="Nova Senha" 
                        required 
                        autoFocus
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

                <div className="relative group">
                    <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmNewPassword} 
                        onChange={e => setConfirmNewPassword(e.target.value)} 
                        className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pr-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-all placeholder:text-zinc-400 font-medium group-hover:border-zinc-300 dark:group-hover:border-zinc-700" 
                        placeholder="Confirmar Nova Senha" 
                        required 
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-gold-500 transition-colors"
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>
            
            <button 
              disabled={loading}
              className="w-full py-4 bg-gold-600 hover:bg-gold-500 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <span className="animate-pulse">Atualizando...</span> : <>Redefinir Senha <CheckCircle2 size={18}/></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
