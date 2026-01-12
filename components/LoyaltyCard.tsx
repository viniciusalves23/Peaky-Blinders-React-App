
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, Calendar, Clock, Scissors, User, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Appointment, Service, Barber } from '../types';

interface LoyaltyCardProps {
  appointments: Appointment[]; // Apenas concluídos
  services: Service[];
  barbers: Barber[];
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ appointments, services, barbers }) => {
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  
  // 1. Filtrar concluídos e Ordenar Cronologicamente (Antigo -> Novo)
  // Isso garante que o corte #1 seja o primeiro da história, e o #14 seja o décimo quarto.
  const history = appointments
    .filter(a => a.status === 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalCuts = history.length;
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalCuts / itemsPerPage));

  // 2. Estado da Página Atual (Inicia na última página para mostrar os mais recentes)
  const [currentPage, setCurrentPage] = useState(totalPages);

  // Garante que se os dados carregarem depois, vá para a última página
  useEffect(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // 3. Dados da Página Atual
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSlots = history.slice(startIndex, startIndex + itemsPerPage);

  const getDetails = (appt: Appointment) => {
    const srv = services.find(s => s.id === appt.serviceId);
    const brb = barbers.find(b => b.id === appt.barberId);
    return { serviceName: srv?.name || 'Serviço', barberName: brb?.name || 'Barbeiro' };
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(curr => curr + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(curr => curr - 1);
  };

  return (
    <>
      <div className="w-full bg-gradient-to-br from-charcoal-900 to-black border border-gold-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500">
        {/* Background Texture Effect */}
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #D4AF37 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

        <div className="relative z-10">
          {/* Header com Navegação */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-gold-500 font-serif text-xl sm:text-2xl font-bold tracking-widest uppercase">Carteira do Membro</h3>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-zinc-500 text-[10px] tracking-wider uppercase">Registro Oficial</p>
                 {totalPages > 1 && (
                   <span className="text-[9px] font-black bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                     Pág {currentPage}/{totalPages}
                   </span>
                 )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <div className="bg-gold-500/10 border border-gold-500/50 rounded-full px-3 py-1">
                  <span className="text-gold-500 text-xs font-bold">{totalCuts} Cortes</span>
                </div>
                
                {/* Controles de Paginação */}
                {totalPages > 1 && (
                  <div className="flex gap-1">
                    <button 
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-zinc-800 text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded bg-zinc-800 text-gold-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Grid de Slots */}
          <div className="grid grid-cols-5 gap-3 animate-fade-in" key={currentPage}> 
            {/* key=currentPage força a animação ao trocar de página */}
            {Array.from({ length: itemsPerPage }).map((_, index) => {
              const appt = currentSlots[index]; // Pode ser undefined se a página não estiver cheia
              const isStamped = !!appt;
              const slotNumber = startIndex + index + 1;

              return (
                <button 
                  key={index}
                  disabled={!isStamped}
                  onClick={() => isStamped && setSelectedAppt(appt)}
                  className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-300 relative group ${
                    isStamped 
                      ? 'bg-gold-600 border-gold-500 shadow-[0_0_10px_rgba(212,175,55,0.3)] cursor-pointer hover:scale-110 hover:bg-gold-500' 
                      : 'bg-zinc-900 border-zinc-800 border-dashed cursor-default'
                  }`}
                >
                  {isStamped ? (
                    <>
                      <Scissors className="text-black w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} />
                      {/* Tooltip Hover */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[8px] px-2 py-1 rounded whitespace-nowrap border border-zinc-700 pointer-events-none z-20 shadow-xl">
                        {new Date(appt.date).toLocaleDateString()}
                      </div>
                    </>
                  ) : (
                    <span className="text-zinc-700 text-[10px] font-bold">{slotNumber}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-[9px] uppercase tracking-widest">
              Peaky Blinders Barbearia • Est. 2020
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAppt && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-gold-600/30 p-8 shadow-2xl relative animate-scale-in">
              <button 
                onClick={() => setSelectedAppt(null)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-gold-600 rounded-full flex items-center justify-center mx-auto mb-4 text-black shadow-lg">
                    <Scissors size={32} />
                 </div>
                 <h3 className="text-xl font-serif font-bold text-white uppercase tracking-wider">Registro de Serviço</h3>
                 <p className="text-[10px] font-black uppercase text-gold-600 mt-1">Ref: {selectedAppt.id.slice(0,8)}</p>
              </div>

              <div className="space-y-4 bg-black/40 p-6 rounded-2xl border border-zinc-800">
                 <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3 text-zinc-400">
                       <Calendar size={16} />
                       <span className="text-xs font-bold uppercase">Data</span>
                    </div>
                    <span className="text-white font-bold text-sm">{new Date(selectedAppt.date + 'T12:00:00').toLocaleDateString()}</span>
                 </div>
                 
                 <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3 text-zinc-400">
                       <Clock size={16} />
                       <span className="text-xs font-bold uppercase">Horário</span>
                    </div>
                    <span className="text-white font-bold text-sm">{selectedAppt.time}</span>
                 </div>

                 <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3 text-zinc-400">
                       <Scissors size={16} />
                       <span className="text-xs font-bold uppercase">Serviço</span>
                    </div>
                    <span className="text-white font-bold text-sm">{getDetails(selectedAppt).serviceName}</span>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-zinc-400">
                       <User size={16} />
                       <span className="text-xs font-bold uppercase">Mestre</span>
                    </div>
                    <span className="text-gold-500 font-bold text-sm">{getDetails(selectedAppt).barberName}</span>
                 </div>
              </div>

              <button 
                onClick={() => setSelectedAppt(null)}
                className="w-full mt-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase rounded-xl transition-all text-xs tracking-widest"
              >
                Fechar Registro
              </button>
           </div>
        </div>,
        document.body
      )}
    </>
  );
};
