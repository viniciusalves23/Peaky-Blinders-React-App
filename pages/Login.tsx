
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { Scissors, ChevronLeft, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = await login(email, password);
    setLoading(false);
    
    if (result.success) {
      const stored = localStorage.getItem('pb_current_user'); // (Opcional: sua lógica antiga)
      // O redirecionamento base agora pode ser feito verificando o user no AuthContext, 
      // mas vamos redirecionar manualmente aqui para garantir
      navigate('/');
    } else {
      setError(result.message || 'Erro ao realizar login.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in relative">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm hover:text-white transition-colors"><ChevronLeft size={20} /> Voltar</Link>
      
      <div className="w-16 h-16 rounded-full border-2 border-gold-500 flex items-center justify-center mb-6 shadow-gold-glow">
        <Scissors className="text-gold-500" size={32} />
      </div>
      <h2 className="text-3xl font-serif text-zinc-900 dark:text-gold-500 mb-8 font-bold">Peaky Blinders</h2>
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2">
            <AlertTriangle className="shrink-0" size={16} />
            <span className="font-bold">{error}</span>
          </div>
        )}
        
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-colors" 
          placeholder="Email" 
          required 
        />
        
        <div className="relative">
          <input 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pr-12 text-zinc-900 dark:text-white focus:border-gold-500 outline-none transition-colors" 
            placeholder="Senha" 
            required 
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-gold-500 transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs font-bold text-zinc-400 hover:text-gold-600 transition-colors">Esqueci minha senha</Link>
        </div>
        
        <button 
          disabled={loading}
          type="submit" 
          className="w-full bg-gold-600 text-white font-black uppercase py-4 rounded-xl shadow-lg hover:bg-gold-500 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      
      <p className="mt-8 text-zinc-500 text-sm">
        Não tem conta? <Link to="/register" className="text-gold-600 font-bold hover:underline">Cadastre-se</Link>
      </p>
    </div>
  );
};
