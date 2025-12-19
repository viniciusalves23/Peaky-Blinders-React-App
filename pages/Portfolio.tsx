
import React, { useState } from 'react';
import { BARBERS } from '../constants';
import { Instagram, MessageSquare, X, ChevronRight, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;

export const Portfolio: React.FC = () => {
  const [selectedBarberId, setSelectedBarberId] = useState<string>(BARBERS[0].id);
  const [chatOpen, setChatOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentBarber = BARBERS.find(b => b.id === selectedBarberId);

  const handleOpenChat = () => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    setChatOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if(!message.trim()) return;
    
    // Simula o envio identificado
    alert(`Mensagem de ${user?.name} enviada para ${currentBarber?.name}: "${message}"`);
    setMessage('');
    setChatOpen(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif text-white">Nossos Mestres</h2>
      
      {/* Barber Selector (Horizontal Scroll) */}
      <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
        {BARBERS.map(barber => (
          <button
            key={barber.id}
            onClick={() => setSelectedBarberId(barber.id)}
            className={`flex flex-col items-center min-w-[80px] space-y-2 transition-opacity ${
              selectedBarberId === barber.id ? 'opacity-100' : 'opacity-50'
            }`}
          >
            <div className={`p-1 rounded-full border-2 ${selectedBarberId === barber.id ? 'border-gold-500' : 'border-transparent'}`}>
              <img src={barber.avatar} className="w-16 h-16 rounded-full object-cover" alt={barber.name} />
            </div>
            <span className="text-xs font-medium text-white">{barber.name}</span>
          </button>
        ))}
      </div>

      {/* Portfolio Grid */}
      <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-serif text-gold-500">{currentBarber?.name}</h3>
            <p className="text-zinc-400 text-sm">{currentBarber?.specialty}</p>
          </div>
          <button 
            onClick={handleOpenChat}
            className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-full border border-zinc-700 transition-colors shadow-lg"
          >
            <MessageSquare size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {currentBarber?.portfolio.map((img, idx) => (
            <div key={idx} className="aspect-[3/4] rounded-lg overflow-hidden relative group">
              <img src={img} alt="Exemplo de corte" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth Required Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 w-full max-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden p-6 animate-scale-in text-center">
             <div className="w-16 h-16 bg-gold-500/10 border border-gold-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-gold-500">
               <MessageSquare size={32} />
             </div>
             <h3 className="text-xl font-serif text-white mb-2">Login Necessário</h3>
             <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
               Para garantir a qualidade e identificação, você precisa estar logado para enviar mensagens aos nossos barbeiros.
             </p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={() => navigate('/login')}
                 className="w-full py-3 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 <LogIn size={18} /> Fazer Login
               </button>
               <button 
                 onClick={() => navigate('/register')}
                 className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
               >
                 <UserPlus size={18} /> Criar uma Conta
               </button>
               <button 
                 onClick={() => setLoginModalOpen(false)}
                 className="text-zinc-500 text-xs mt-2 hover:text-zinc-300"
               >
                 Agora não
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Mock Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-slide-up mb-16 sm:mb-0">
            <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                <span className="font-serif text-white">Chat com {currentBarber?.name}</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 h-64 overflow-y-auto space-y-3 bg-zinc-900/50">
               <div className="flex justify-start">
                 <div className="bg-zinc-800 text-zinc-200 p-3 rounded-2xl rounded-tl-none text-sm max-w-[80%]">
                   Olá! Aguardo sua visita em breve. Se for atrasar, me avise por aqui.
                 </div>
               </div>
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 flex gap-2 bg-zinc-900">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Mensagem de ${user?.name.split(' ')[0]}...`}
                className="flex-1 bg-black border border-zinc-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
              />
              <button type="submit" className="bg-gold-500 text-black p-2 rounded-full font-bold hover:bg-gold-400 transition-colors">
                 <ChevronRight size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
