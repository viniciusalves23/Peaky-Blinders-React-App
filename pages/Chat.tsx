
import React, { useState, useEffect, useRef } from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { Message, User } from '../types';
import { Send, ChevronLeft, User as UserIcon, CheckCheck } from 'lucide-react';

export const Chat: React.FC = () => {
  const { recipientId } = useParams<{ recipientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !recipientId) {
      navigate('/login');
      return;
    }

    const loadChat = () => {
      // Marcar como lida sempre que carregar se houver mensagens pendentes
      db.markMessagesAsRead(user.id, recipientId);
      
      const allMsgs = db.getMessages();
      const chatMsgs = allMsgs.filter(m => 
        (m.senderId === user.id && m.receiverId === recipientId) ||
        (m.senderId === recipientId && m.receiverId === user.id)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      setMessages(chatMsgs);

      const target = db.getUsers().find(u => u.id === recipientId);
      if (target) setRecipient(target);
    };

    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, [user, recipientId, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !recipientId) return;

    db.sendMessage({
      senderId: user.id,
      receiverId: recipientId,
      text: inputText
    });

    setInputText('');
    const allMsgs = db.getMessages();
    const chatMsgs = allMsgs.filter(m => 
        (m.senderId === user.id && m.receiverId === recipientId) ||
        (m.senderId === recipientId && m.receiverId === user.id)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setMessages(chatMsgs);
  };

  const getDisplayName = () => {
    if (!recipient) return 'Carregando...';
    if (recipient.role === 'admin') return 'Suporte Shelby';
    return recipient.name;
  };

  return (
    <div className="flex flex-col h-[85vh] -mt-6 -mx-4 md:mx-0 md:rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl animate-fade-in">
      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="w-10 h-10 rounded-full bg-gold-600 flex items-center justify-center text-white font-bold shadow-md">
          {recipient?.role === 'admin' ? 'S' : recipient?.name.charAt(0) || <UserIcon />}
        </div>
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
          disabled={!inputText.trim()}
          className="bg-zinc-900 dark:bg-gold-600 hover:bg-gold-500 text-white dark:text-black p-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
