
import React, { useState } from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    const success = await register(name, email, password);
    if (success) {
      // Verifica se existe um agendamento pendente para redirecionar de volta
      const hasPending = sessionStorage.getItem('pb_pending_booking');
      if (hasPending) {
        navigate('/book');
      } else {
        navigate('/');
      }
    } else {
      setError('Este email já está cadastrado.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 animate-fade-in relative">
      <Link to="/" className="absolute top-6 left-6 text-zinc-400 flex items-center text-sm hover:text-white transition-colors">
        <ChevronLeft size={20} /> Voltar ao Início
      </Link>

      <h2 className="text-3xl font-serif text-white mb-2">Junte-se ao Clube</h2>
      <p className="text-zinc-400 mb-8 text-center text-sm">Crie sua conta para agendamentos exclusivos.</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {error && <div className="p-3 bg-red-900/30 border border-red-800 text-red-400 text-xs rounded text-center">{error}</div>}
        
        <div>
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Nome Completo</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-gold-500 focus:outline-none"
            placeholder="Thomas Shelby"
            required
          />
        </div>

        <div>
          <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:border-gold-500 focus:outline-none"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
           <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Senha</label>
           <div className="relative">
             <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 pr-12 text-white focus:border-gold-500 focus:outline-none"
              placeholder="********"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-gold-500 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
           </div>
        </div>

        <button type="submit" className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-lg uppercase tracking-wider transition-colors">
          Criar Conta
        </button>
      </form>

      <p className="mt-6 text-zinc-400 text-sm">
        Já tem uma conta? <Link to="/login" className="text-gold-500 font-bold hover:underline">Entrar</Link>
      </p>
    </div>
  );
};
