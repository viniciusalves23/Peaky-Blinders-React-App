
import React, { useState } from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { Scissors, ChevronLeft, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      const stored = localStorage.getItem('pb_current_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === 'admin') navigate('/admin');
      else if (user?.role === 'barber') navigate('/barber');
      else navigate('/');
    } else setError('Credenciais inválidas.');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm"><ChevronLeft size={20} /> Voltar</Link>
      <div className="w-16 h-16 rounded-full border-2 border-gold-500 flex items-center justify-center mb-6"><Scissors className="text-gold-500" size={32} /></div>
      <h2 className="text-3xl font-serif text-zinc-900 dark:text-gold-500 mb-8 font-bold">Peaky Blinders</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-600 text-xs rounded text-center">{error}</div>}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 focus:border-gold-500" placeholder="Email" required />
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 pr-12 focus:border-gold-500" placeholder="Senha" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
        </div>
        <div className="text-right">
          <Link to="/forgot-password" className="text-xs font-bold text-zinc-400 hover:text-gold-600">Esqueci minha senha</Link>
        </div>
        <button type="submit" className="w-full bg-gold-600 text-white font-black uppercase py-4 rounded-xl shadow-lg">Entrar</button>
      </form>
      <p className="mt-8 text-zinc-500 text-sm">Não tem conta? <Link to="/register" className="text-gold-600 font-bold">Cadastre-se</Link></p>
    </div>
  );
};
