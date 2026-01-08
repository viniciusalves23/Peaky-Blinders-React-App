
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate, useLocation } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Message, User } from '../types';
import { Send, ChevronLeft, User as UserIcon, CheckCheck } from 'lucide-react';

export const Chat: React.FC = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  
  // State to hold the actual UUID (resolves 'admin' -> 'uuid')
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Effect 1: Resolve Recipient ID and Profile
  useEffect(() => {
    if (!user || !recipientId) {
      navigate('/login');
      return;
    }

    const resolveRecipient = async () => {
      // Reset states when changing chat
      setMessages([]);
      setRecipient(null);
      setActiveChatId(null);

      try {
        if (recipientId === 'admin') {
          // Find the admin user
          const allUsers = await api.getAllUsers();
          const adminUser = allUsers.find(u => u.role === 'admin');
          if (adminUser) {
            setRecipient(adminUser);
            setActiveChatId(adminUser.id);
          } else {
            console.error("Suporte indisponível (Admin não encontrado)");
          }
        } else {
          // Normal user ID
          setActiveChatId(recipientId);
          const userProfile = await api.getUserProfile(recipientId);
          if (userProfile) {
            setRecipient(userProfile);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar destinatário", error);
      }
    };

    resolveRecipient();
  }, [recipientId, user, navigate]);

  // Effect 2: Load/Poll Messages (Only runs when we have a resolved ID)
  useEffect(() => {
    if (!user || !activeChatId) return;

    const loadMessages = async () => {
      try {
        // Mark as read
        await api.markMessagesAsRead(user.id, activeChatId);
        
        // Get messages
        const allMsgs = await api.getMessages(user.id);
        const chatMsgs = allMsgs.filter(m => 
          (m.senderId === user.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        setMessages(chatMsgs);
      } catch (error) {
        console.error("Erro ao carregar mensagens", error);
      }
    };

    loadMessages(); // Initial load
    const interval = setInterval(loadMessages, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [user, activeChatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeChatId) return;

    try {
      await api.sendMessage({
        senderId: user.id,
        receiverId: activeChatId,
        text: inputText
      });

      setInputText('');
      
      // Immediate refresh for better UX
      const allMsgs = await api.getMessages(user.id);
      const chatMsgs = allMsgs.filter(m => 
          (m.senderId === user.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(chatMsgs);
    } catch (error) {
      console.error("Erro ao enviar mensagem", error);
    }
  };

  const getDisplayName = () => {
    if (!recipient) return 'Carregando...';
    if (recipient.role === 'admin') return 'Suporte Shelby';
    return recipient.name;
  };

  const handleBack = () => {
    // Se temos um estado de origem, voltamos para lá restaurando o contexto
    if (location.state?.from) {
        navigate(location.state.from, { 
            state: { 
                from: location.state.returnPath,
                returnTab: location.state.returnTab
            }
        });
    } else {
        // Se não, voltamos para a lista de mensagens (padrão seguro)
        navigate('/messages');
    }
  };

  return (
    <div className="flex flex-col h-[85vh] -mt-6 -mx-4 md:mx-0 md:rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl animate-fade-in">
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
        <button onClick={handleBack} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        {recipient ? (
            <img 
            src={recipient.avatarUrl} 
            alt={recipient.name} 
            className="w-10 h-10 rounded-full object-cover bg-zinc-800 border border-zinc-700" 
            />
        ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
        )}
        <div>
          <h3 className="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-wider">{getDisplayName()}</h3>
          <span className="text-[10px] text-green-500 font-black uppercase flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Online Agora
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
            <UserIcon size={48} className="mb-4 text-zinc-300" />
            <p className="text-sm font-black uppercase tracking-widest">Inicie a conversa</p>
            <p className="text-xs mt-1 italic">Diga olá e tire suas dúvidas.</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                isMe 
                  ? 'bg-gold-600 text-white rounded-tr-none' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-800'
              }`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-white/60' : 'text-zinc-500'}`}>
                  <span className="text-[9px] font-bold">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <CheckCheck size={12} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escreva sua mensagem..."
          className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-gold-500 transition-colors shadow-inner"
        />
        <button 
          type="submit" 
          disabled={!inputText.trim() || !activeChatId}
          className="bg-zinc-900 dark:bg-gold-600 hover:bg-gold-500 text-white dark:text-black p-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
