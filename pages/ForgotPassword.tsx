
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { requestPasswordReset } = useAuth();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await requestPasswordReset(email);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message || 'Erro ao enviar e-mail.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in">
      <Link to="/login" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm hover:text-white transition-colors"><ChevronLeft size={20} /> Voltar ao Login</Link>
      
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
        {!success ? (
          <form onSubmit={handleSendEmail} className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gold-600/10 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-600">
                <Mail size={32} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white">Recuperar Senha</h2>
              <p className="text-sm text-zinc-500 mt-2">Insira seu e-mail para receber um link de redefinição.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 font-bold">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 focus:border-gold-500 outline-none text-zinc-900 dark:text-white" 
              placeholder="Seu E-mail" 
              required 
            />
            
            <button 
              disabled={loading}
              className="w-full py-4 bg-gold-600 text-white font-black uppercase rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Link'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6 py-6 animate-scale-in">
            <CheckCircle2 className="mx-auto text-green-500" size={64} />
            <div>
              <h2 className="text-2xl font-serif font-bold text-zinc-900 dark:text-white mb-2">E-mail Enviado!</h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Verifique sua caixa de entrada (e spam) em <strong>{email}</strong>. 
                <br/>Clique no link enviado para definir sua nova senha.
              </p>
            </div>
            <button onClick={() => setSuccess(false)} className="text-gold-600 text-xs font-bold uppercase hover:underline">
              Tentar outro e-mail
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
