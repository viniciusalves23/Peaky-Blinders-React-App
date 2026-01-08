
import React, { useState, useRef, useEffect } from 'react';
import { Home, Calendar, Scissors, User, LogOut, ChevronDown, ShieldAlert, Briefcase, MessageCircle, Bell } from 'lucide-react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useLocation, useNavigate, Link } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const checkBadges = async () => {
      if (user) {
        const msgs = await api.getUnreadMessagesCount(user.id);
        const notifs = await api.getUnreadNotificationsCount(user.id);
        setUnreadMsgs(msgs);
        setUnreadNotifs(notifs);
      }
    };
    checkBadges();
    const interval = setInterval(checkBadges, 10000); // Poll mais lento para backend
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (['/login', '/register', '/forgot-password'].includes(location.pathname)) {
    return <div className="min-h-screen bg-white dark:bg-charcoal-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">{children}</div>;
  }

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-charcoal-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300 overflow-hidden">
      {/* Header Desktop & Mobile Title */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-charcoal-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/50 px-4 py-3 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-8">
           <Link to="/" className="text-xl font-serif font-bold tracking-wider text-gold-600 dark:text-gold-500 hover:text-gold-500 transition-colors">
             PEAKY BLINDERS
           </Link>
           {/* Nav Desktop com Badges */}
           <nav className="hidden md:flex items-center gap-8">
             <Link to="/" className={`text-xs font-bold uppercase tracking-widest transition-colors ${isActive('/') ? 'text-gold-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}>Início</Link>
             <Link to="/book" className={`text-xs font-bold uppercase tracking-widest transition-colors ${isActive('/book') ? 'text-gold-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}>Agendar</Link>
             <Link to="/portfolio" className={`text-xs font-bold uppercase tracking-widest transition-colors ${isActive('/portfolio') ? 'text-gold-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}>Mestres</Link>
             <Link to="/messages" className={`text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${isActive('/messages') ? 'text-gold-600' : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}>
                Mensagens
                {unreadMsgs > 0 && (
                  <span className="bg-gold-600 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                    {unreadMsgs}
                  </span>
                )}
             </Link>
           </nav>
         </div>

         <div className="flex items-center gap-4">
           {user ? (
             <div className="flex items-center gap-2 md:gap-4">
               {/* Notificações Desktop (Acesso Rápido) */}
               <Link to="/notifications" className="hidden md:flex relative p-2 text-zinc-400 hover:text-gold-600 transition-colors">
                 <Bell size={20} />
                 {unreadNotifs > 0 && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-white dark:border-zinc-950"></span>
                 )}
               </Link>

               <div className="relative" ref={dropdownRef}>
                 <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full p-1 pr-3 shadow-sm group relative">
                   <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800"
                   />
                   <span className="hidden sm:block text-xs font-black uppercase tracking-widest">{user.name.split(' ')[0]}</span>
                   <ChevronDown size={14} className={`transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                   
                   {/* Badge simplificado no botão de perfil para mobile ou compact view */}
                   {unreadNotifs > 0 && (
                     <div className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 rounded-full flex md:hidden items-center justify-center text-[7px] text-white font-black border-2 border-white dark:border-zinc-900">
                       {unreadNotifs}
                     </div>
                   )}
                 </button>

                 {isProfileMenuOpen && (
                   <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 animate-fade-in overflow-hidden z-[100]">
                     <Link to="/notifications" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-gold-600">
                       <div className="flex items-center gap-3">
                         <Bell size={18} /> Notificações
                       </div>
                       {unreadNotifs > 0 && <span className="bg-red-600 text-white px-1.5 py-0.5 rounded-full text-[8px]">{unreadNotifs}</span>}
                     </Link>

                     <Link to="/profile" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-gold-600">
                       <User size={18} /> Meu Perfil
                     </Link>
                     
                     <Link to="/messages" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-gold-600">
                       <div className="flex items-center gap-3">
                         <MessageCircle size={18} /> Minhas Mensagens
                       </div>
                       {unreadMsgs > 0 && <span className="bg-gold-600 text-white px-1.5 py-0.5 rounded-full text-[8px]">{unreadMsgs}</span>}
                     </Link>

                     {(user.role === 'admin' || user.role === 'barber-admin') && (
                       <Link to="/admin" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest bg-gold-600/10 text-gold-600 dark:text-gold-500 hover:bg-gold-600 hover:text-white">
                         <ShieldAlert size={18} /> Painel de Comando
                       </Link>
                     )}
                     
                     {(user.role === 'barber' || user.role === 'barber-admin') && (
                       <Link to="/barber" onClick={() => setIsProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white">
                         <Briefcase size={18} /> Minha Agenda
                       </Link>
                     )}

                     <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                     <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                       <LogOut size={18} /> Sair
                     </button>
                   </div>
                 )}
               </div>
             </div>
           ) : (
             <Link to="/login" className="text-[10px] font-black uppercase tracking-widest bg-gold-600 text-white px-5 py-2.5 rounded shadow-lg active:scale-95 transition-transform">Entrar</Link>
           )}
         </div>
      </header>

      {/* Main Content Area */}
      <main ref={mainRef} className="flex-1 pb-32 md:pb-12 px-4 pt-6 overflow-y-auto max-w-5xl mx-auto w-full">
        {children}
      </main>

      {/* Navigation Mobile Fixed (Bottom Nav) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-charcoal-950/90 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800/50 px-6 py-3 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <Link to="/" className="flex flex-col items-center gap-1">
          <Home size={22} className={isActive('/') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${isActive('/') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'}`}>Início</span>
        </Link>
        <Link to="/book" className="flex flex-col items-center gap-1">
          <Calendar size={22} className={isActive('/book') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${isActive('/book') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'}`}>Agendar</span>
        </Link>
        
        {/* Chat icon with unread indicator */}
        <Link to="/messages" className="flex flex-col items-center gap-1 relative">
          <MessageCircle size={22} className={isActive('/messages') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${isActive('/messages') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'}`}>Chat</span>
          {unreadMsgs > 0 && (
             <div className="absolute top-0 -right-1 w-2.5 h-2.5 bg-gold-600 rounded-full border border-white dark:border-zinc-900 animate-pulse"></div>
          )}
        </Link>

        <Link to="/profile" className="flex flex-col items-center gap-1 relative">
          <User size={22} className={isActive('/profile') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'} />
          <span className={`text-[9px] font-black uppercase tracking-wider ${isActive('/profile') ? 'text-gold-600 dark:text-gold-500' : 'text-zinc-400'}`}>Perfil</span>
          {unreadNotifs > 0 && (
             <div className="absolute top-0 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white dark:border-zinc-900 animate-pulse"></div>
          )}
        </Link>
      </nav>
    </div>
  );
};
