
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Bell, MessageCircle, Calendar, ChevronRight, Check, Trash2, X, Star } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, useLocation } = ReactRouterDOM;
import { Notification } from '../types';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (user) {
        const notifs = await api.getNotifications(user.id);
        setNotifications(notifs);
    }
  };

  const handleAction = async (notif: Notification) => {
    await api.markNotificationAsRead(notif.id);
    navigate(notif.link, { state: { from: location.pathname } });
  };

  const markAllRead = async () => {
    if (!user) return;
    for (const n of notifications) {
        await api.markNotificationAsRead(n.id);
    }
    loadNotifications();
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">Notificações</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-gold-600 mt-1">Alertas da Central Shelby</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllRead}
            className="text-[10px] font-black uppercase text-zinc-400 hover:text-gold-600 transition-colors flex items-center gap-2"
          >
            <Check size={14} /> Marcar todas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Bell size={64} className="mx-auto text-zinc-200 dark:text-zinc-800 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest text-zinc-400">Tudo limpo por aqui</p>
            <p className="text-xs text-zinc-500 mt-2">Você não tem alertas pendentes.</p>
          </div>
        ) : (
          notifications.map(notif => {
            const isReview = notif.title.includes('Avaliação') || notif.message.includes('estrelas');
            
            return (
              <button
                key={notif.id}
                onClick={() => handleAction(notif)}
                className={`w-full p-5 rounded-2xl border transition-all text-left flex gap-4 group relative ${
                  notif.read 
                    ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800' 
                    : 'bg-white dark:bg-zinc-900 border-gold-600/30 shadow-lg ring-1 ring-gold-600/10'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === 'message' ? 'bg-gold-600/10 text-gold-600' : 
                  isReview ? 'bg-gold-500 text-black shadow-gold-glow' :
                  notif.type === 'appointment' ? 'bg-blue-600/10 text-blue-600' : 
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {notif.type === 'message' ? <MessageCircle size={20} /> : 
                   isReview ? <Star size={20} fill="currentColor" /> :
                   notif.type === 'appointment' ? <Calendar size={20} /> : 
                   <Bell size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold uppercase tracking-tight truncate ${notif.read ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[9px] font-bold text-zinc-400 whitespace-nowrap">{getTimeAgo(notif.timestamp)}</span>
                  </div>
                  <p className={`text-xs leading-relaxed truncate pr-4 ${notif.read ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                    {notif.message}
                  </p>
                </div>

                <ChevronRight size={18} className={`self-center text-zinc-300 transition-transform group-hover:translate-x-1 ${notif.read ? '' : 'text-gold-600'}`} />
                
                {!notif.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 bg-gold-600 rounded-full"></div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
