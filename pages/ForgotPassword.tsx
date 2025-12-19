
import React, { useState } from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { ChevronLeft, Mail, Lock, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSendEmail = (e: React.FormEvent) => { e.preventDefault(); setStep(2); };
  const handleVerifyCode = (e: React.FormEvent) => { e.preventDefault(); setStep(3); };
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { alert("Senhas não coincidem!"); return; }
    if (newPassword.length < 6) { alert("Senha muito fraca!"); return; }
    setStep(4);
  };

  const StrengthBar = ({ pass }: { pass: string }) => {
    const strength = pass.length > 8 ? 'bg-green-500 w-full' : pass.length > 5 ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3';
    return <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 mt-1 rounded-full overflow-hidden"><div className={`h-full transition-all ${strength}`}></div></div>;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in">
      <Link to="/login" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm"><ChevronLeft size={20} /> Voltar ao Login</Link>
      
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        {step === 1 && (
          <form onSubmit={handleSendEmail} className="space-y-6">
            <div className="text-center"><div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600"><Mail size={32} /></div><h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Recuperar Senha</h2><p className="text-sm text-zinc-500 mt-2">Enviaremos um código de segurança para o seu e-mail cadastrado.</p></div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 focus:border-gold-500" placeholder="Seu E-mail" required />
            <button className="w-full py-4 bg-gold-600 text-white font-black uppercase rounded-xl">Enviar Código</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="text-center"><div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600"><ShieldCheck size={32} /></div><h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Verificar Código</h2><p className="text-sm text-zinc-500 mt-2">Insira o código de 6 dígitos enviado para <strong>{email}</strong>.</p></div>
            <input type="text" maxLength={6} value={code} onChange={e => setCode(e.target.value)} className="w-full text-center tracking-[1em] text-2xl font-black bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 focus:border-gold-500" placeholder="000000" required />
            <button className="w-full py-4 bg-gold-600 text-white font-black uppercase rounded-xl">Validar Código</button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center"><div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600"><Lock size={32} /></div><h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Nova Senha</h2><p className="text-sm text-zinc-500 mt-2">Escolha uma senha forte para sua segurança.</p></div>
            <div className="space-y-4">
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pr-12" placeholder="Nova Senha" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">{showPass ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                <StrengthBar pass={newPassword} />
              </div>
              <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`w-full bg-zinc-50 dark:bg-black border rounded-xl p-4 ${confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'}`} placeholder="Confirmar Senha" required />
            </div>
            <button className="w-full py-4 bg-gold-600 text-white font-black uppercase rounded-xl">Alterar Senha</button>
          </form>
        )}

        {step === 4 && (
          <div className="text-center space-y-6 py-6">
            <CheckCircle2 className="mx-auto text-green-500" size={64} />
            <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Tudo Pronto!</h2>
            <p className="text-sm text-zinc-500">Sua senha foi alterada com sucesso. Já pode voltar para a barbearia.</p>
            <button onClick={() => navigate('/login')} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase rounded-xl">Ir para Login</button>
          </div>
        )}
      </div>
    </div>
  );
};
