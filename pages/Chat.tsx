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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // --- SOLUÇÃO MÁGICA PARA O TECLADO ---
  // Iniciamos com a altura da janela, mas vamos atualizar via JS
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  // -------------------------------------
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Carrega Destinatário
  useEffect(() => {
    if (!user || !recipientId) {
      navigate('/login');
      return;
    }
    const resolveRecipient = async () => {
      setMessages([]);
      setRecipient(null);
      setActiveChatId(null);
      try {
        if (recipientId === 'admin') {
          const allUsers = await api.getAllUsers();
          const adminUser = allUsers.find(u => u.role === 'admin');
          if (adminUser) {
            setRecipient(adminUser);
            setActiveChatId(adminUser.id);
          }
        } else {
          setActiveChatId(recipientId);
          const userProfile = await api.getUserProfile(recipientId);
          if (userProfile) setRecipient(userProfile);
        }
      } catch (error) {
        console.error("Erro ao carregar destinatário", error);
      }
    };
    resolveRecipient();
  }, [recipientId, user, navigate]);

  // 2. Carrega Mensagens (Polling)
  useEffect(() => {
    if (!user || !activeChatId) return;
    const loadMessages = async () => {
      try {
        await api.markMessagesAsRead(user.id, activeChatId);
        const allMsgs = await api.getMessages(user.id);
        const chatMsgs = allMsgs.filter(m => 
          (m.senderId === user.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setMessages(chatMsgs);
      } catch (error) {}
    };
    loadMessages(); 
    const interval = setInterval(loadMessages, 3000); 
    return () => clearInterval(interval);
  }, [user, activeChatId]);

  // 3. Scroll para o fundo
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    // Timeout para garantir que o layout renderizou
    setTimeout(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior, block: "end" });
        }
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- O PULO DO GATO: DETECTAR TECLADO E REDIMENSIONAR NA MARRA ---
  useEffect(() => {
    const handleVisualResize = () => {
      // Se a API visualViewport estiver disponível (Android moderno tem)
      if (window.visualViewport) {
        // Atualiza a altura do container para ser EXATAMENTE a área visível (sem o teclado)
        setViewportHeight(window.visualViewport.height);
        
        // Se a altura diminuiu (teclado abriu), rola pro fundo
        if (window.visualViewport.height < window.innerHeight) {
            scrollToBottom('auto');
        }
      } else {
        // Fallback para iOS/Browsers antigos
        setViewportHeight(window.innerHeight);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualResize);
      window.visualViewport.addEventListener('scroll', handleVisualResize);
    } else {
      window.addEventListener('resize', handleVisualResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualResize);
        window.visualViewport.removeEventListener('scroll', handleVisualResize);
      } else {
        window.removeEventListener('resize', handleVisualResize);
      }
    };
  }, []);

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
      
      const allMsgs = await api.getMessages(user.id);
      const chatMsgs = allMsgs.filter(m => 
          (m.senderId === user.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(chatMsgs);
      
      // Mantém foco e rola
      inputRef.current?.focus(); 
      scrollToBottom('auto');
    } catch (error) {
      console.error("Erro envio", error);
    }
  };

  const getDisplayName = () => {
    if (!recipient) return 'Carregando...';
    if (recipient.role === 'admin') return 'Suporte Shelby';
    return recipient.name;
  };

  const handleBack = () => {
    if (location.state?.from) {
        navigate(location.state.from, { 
            state: { from: location.state.returnPath, returnTab: location.state.returnTab }
        });
    } else {
        navigate('/messages');
    }
  };

  return (
    // CONTAINER PRINCIPAL
    // height: viewportHeight -> Define a altura exata em PIXELS via JS.
    // Isso força o app a "caber" no espaço que sobra acima do teclado.
    <div 
        className="flex flex-col w-full bg-white dark:bg-zinc-950 overflow-hidden fixed left-0 top-0 z-[9999]"
        style={{ height: `${viewportHeight}px` }} 
    >
      
      {/* HEADER (Tamanho Fixo - flex-none) */}
      <div className="flex-none bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 safe-top">
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

      {/* ÁREA DE MENSAGENS (Ocupa o que sobra - flex-1) */}
      {/* Quando a altura do pai diminui (teclado abre), essa área encolhe automaticamente */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scroll-smooth bg-white dark:bg-zinc-950">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
            <UserIcon size={48} className="mb-4 text-zinc-300" />
            <p className="text-sm font-black uppercase tracking-widest">Inicie a conversa</p>
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm ${
                isMe 
                  ? 'bg-gold-600 text-white rounded-tr-none' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-800'
              }`}>
                <p className="text-sm leading-relaxed break-words">{m.text}</p>
                <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'text-white/60' : 'text-zinc-500'}`}>
                  <span className="text-[9px] font-bold">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && <CheckCheck size={12} />}
                </div>
              </div>
            </div>
          );
        })}
        {/* Div vazia para garantir que o scroll vá até o final mesmo */}
        <div ref={scrollRef} className="h-1" />
      </div>

      {/* INPUT AREA (Tamanho Fixo - flex-none) */}
      {/* Fica sempre colado no fundo do container pai. Se o pai encolhe, ele sobe. */}
      <form 
        onSubmit={handleSend} 
        className="flex-none p-3 sm:p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 w-full safe-bottom"
      >
        <input 
          ref={inputRef}
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onFocus={() => {
              // Hack extra: espera o teclado subir e rola pro fundo
              setTimeout(() => {
                  scrollToBottom('auto');
                  // Se o visualViewport não disparou, forçamos um scroll no window
                  if (scrollRef.current) scrollRef.current.scrollIntoView();
              }, 300);
          }}
          placeholder="Mensagem..."
          className="flex-1 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 transition-colors"
        />
        <button 
          type="submit" 
          disabled={!inputText.trim()}
          className="bg-zinc-900 dark:bg-gold-600 hover:bg-gold-500 text-white p-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-30 aspect-square flex items-center justify-center"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};