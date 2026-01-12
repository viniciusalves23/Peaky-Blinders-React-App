
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, Message } from '../types';
import { Search, MessageSquarePlus, ChevronRight, User as UserIcon, MessageCircle, X } from 'lucide-react';

export const MessagesList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<{ user: User, lastMessage: Message }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsersForModal, setAllUsersForModal] = useState<User[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const loadConversations = async () => {
      const convs = await api.getConversations(user.id);
      setConversations(convs);
    };
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  useEffect(() => {
    const loadUsers = async () => {
      const users = await api.getAllUsers();
      setAllUsersForModal(users);
    };
    loadUsers();
  }, []);

  const filteredConversations = conversations.filter(c => 
    c.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.user.username && c.user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Lógica de filtragem de membros permitidos para nova conversa
  const availableMembers = allUsersForModal.filter(u => {
    if (u.id === user?.id) return false;
    
    // Restrição: Clientes só podem falar com Barbeiros ou Admin (Suporte)
    if (user?.role === 'customer') {
      if (u.role === 'customer') return false;
    }

    // Filtro de busca por nome, username ou email
    const searchMatch = u.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                        u.email.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                        (u.username && u.username.toLowerCase().includes(memberSearchTerm.toLowerCase()));
    
    return searchMatch;
  });

  const startNewChat = (recipientId: string) => {
    setShowNewChatModal(false);
    setMemberSearchTerm('');
    navigate(`/chat/${recipientId}`);
  };

  const getDisplayRole = (role: string) => {
    if (role === 'admin') return 'Suporte';
    if (role === 'barber') return 'Barbeiro';
    return 'Cliente';
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">Mensagens</h2>
        <button 
          onClick={() => setShowNewChatModal(true)}
          className="p-3 bg-gold-600 text-white rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center gap-2"
        >
          <MessageSquarePlus size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Novo Chat</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar conversa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:border-gold-500 outline-none"
        />
      </div>

      <div className="space-y-2">
        {filteredConversations.length === 0 ? (
          <div className="py-20 text-center opacity-40 flex flex-col items-center">
            <MessageCircle size={64} className="text-zinc-300 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhuma conversa ativa</p>
            <button 
              onClick={() => setShowNewChatModal(true)}
              className="mt-4 text-gold-600 text-xs font-bold uppercase hover:underline"
            >
              Iniciar novo chat
            </button>
          </div>
        ) : (
          filteredConversations.map(({ user: otherUser, lastMessage }) => (
            <button
              key={otherUser.id}
              onClick={() => navigate(`/chat/${otherUser.id}`)}
              className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left shadow-sm group"
            >
              <div className="relative">
                <img src={otherUser.avatarUrl} alt={otherUser.name} className="w-14 h-14 rounded-full object-cover bg-zinc-800" />
                {!lastMessage.read && lastMessage.receiverId === user?.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold-600 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate uppercase tracking-tight">
                    {otherUser.name} {otherUser.username && <span className="text-zinc-500 font-normal normal-case text-xs">(@{otherUser.username})</span>}
                  </h4>
                  <span className="text-[10px] text-zinc-400 font-bold">
                    {new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-zinc-500 truncate pr-4">
                    {lastMessage.senderId === user?.id && <span className="text-zinc-400">Você: </span>}
                    {lastMessage.text}
                  </p>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    otherUser.role === 'admin' ? 'bg-gold-600/10 text-gold-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {getDisplayRole(otherUser.role)}
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-gold-600 transition-colors" />
            </button>
          ))
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 animate-scale-in">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-serif font-bold text-zinc-900 dark:text-white">Nova Conversa</h3>
                <button onClick={() => { setShowNewChatModal(false); setMemberSearchTerm(''); }} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
             </div>

             <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou usuário..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:border-gold-500 outline-none"
                />
             </div>
             
             <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-4">
               {user?.role === 'customer' ? 'Equipe Disponível' : 'Todos os Membros'}
             </p>
             <div className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                {availableMembers.length === 0 ? (
                  <p className="text-center py-10 text-[10px] font-black uppercase text-zinc-400">Nenhum membro encontrado</p>
                ) : (
                  availableMembers.map(u => (
                    <button 
                      key={u.id}
                      onClick={() => startNewChat(u.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase">{u.name}</p>
                        <p className="text-[10px] text-zinc-500">@{u.username || 'sem_user'}</p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300" />
                    </button>
                  ))
                )}
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
