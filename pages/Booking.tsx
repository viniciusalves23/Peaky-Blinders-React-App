
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ChevronRight, Calendar as CalendarIcon, ChevronLeft, LogIn, Clock, Scissors, Star } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import { Appointment, Service, Barber } from '../types';

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
        try {
            const s = await api.getServices();
            setServices(s);
            const b = await api.getBarbers();
            setBarbers(b);

            // LOGICA DE RESTAURAÇÃO DE AGENDAMENTO PENDENTE
            // Verifica se existe um agendamento pendente no sessionStorage
            const pendingBookingJson = sessionStorage.getItem('pending_booking');
            if (pendingBookingJson) {
                const pending = JSON.parse(pendingBookingJson);
                
                // Restaura os estados
                if (pending.serviceId) setSelectedService(pending.serviceId);
                if (pending.barberId) setSelectedBarber(pending.barberId);
                if (pending.date) {
                    setSelectedDate(pending.date);
                    // Necessário setar o período para o calendário renderizar corretamente o dia selecionado
                    const d = new Date(pending.date);
                    setSelectedPeriod({ month: d.getMonth(), year: d.getFullYear() });
                }
                if (pending.time) setSelectedTime(pending.time);

                // Avança para o passo 3 (Confirmação/Horário) diretamente
                setStep(3);
                
                // Limpa o storage para evitar loops futuros indesejados
                sessionStorage.removeItem('pending_booking');
                
                if (user) {
                   addToast("Continuando seu agendamento...", "info");
                }
            }
        } catch (e) {
            console.error("Erro ao carregar dados iniciais", e);
        }
    };
    fetchData();
  }, [user]); // Re-executa se user mudar (ex: login completado)
  
  const today = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: today.getMonth(),
    year: today.getFullYear()
  });

  // Helper para garantir formato local YYYY-MM-DD sem interferência de UTC
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIso = getLocalDateString(today);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const dateOptions = useMemo(() => {
    const dates = [];
    const daysInMonth = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0).getDate();
    
    // Zera horas para comparação correta de datas
    const comparisonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(selectedPeriod.year, selectedPeriod.month, i);
      
      if (d >= comparisonToday) {
        dates.push({
          iso: getLocalDateString(d),
          dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
          dayNum: d.getDate()
        });
      }
    }
    return dates;
  }, [selectedPeriod, selectedBarber]);

  useEffect(() => {
    if (step === 3) {
      if (dateOptions.length > 0) {
        // Tenta manter a data selecionada se ainda estiver visível no novo mês, senão pega a primeira
        // MAS: Se já temos uma selectedDate vinda da restauração, não a sobrescrevemos cegamente
        if (selectedDate && dateOptions.some(d => d.iso === selectedDate)) {
            // Data válida, mantém
        } else {
             const currentSelectedStillValid = dateOptions.find(d => d.iso === selectedDate);
             if (!currentSelectedStillValid) {
                const firstAvailable = dateOptions[0].iso;
                setSelectedDate(firstAvailable);
                setSelectedTime(null);
             }
        }
      } else {
        setSelectedDate('');
        setAvailableTimes([]);
        setSelectedTime(null);
      }
    }
  }, [dateOptions, step]);

  useEffect(() => {
    const fetchSlots = async () => {
        if (step === 3 && selectedBarber && selectedDate && selectedDate !== '') {
            setLoadingTime(true);
            try {
              // Chama o DB Real para calcular slots (Config - Ocupados)
              let filtered = await api.getAvailableSlots(selectedBarber, selectedDate);
              
              // Filtro de horário passado apenas se for HOJE
              if (selectedDate === todayIso) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinutes = now.getMinutes();

                filtered = filtered.filter(time => {
                  const [h, m] = time.split(':').map(Number);
                  // Permite agendar se for hora futura OU mesma hora mas com 20min de antecedência
                  return h > currentHour || (h === currentHour && m > currentMinutes + 20);
                });
              }
              setAvailableTimes(filtered);
              
              if (selectedTime && !filtered.includes(selectedTime)) setSelectedTime(null);
            } catch (error) {
                addToast("Erro ao carregar horários. Verifique sua conexão.", "error");
            } finally {
              setLoadingTime(false);
            }
          } else if (selectedDate === '') {
            setAvailableTimes([]);
          }
    };
    fetchSlots();
  }, [step, selectedBarber, selectedDate]);

  const handleBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedTime || !selectedDate) return;

    if (!user) { 
        // SALVA O ESTADO ATUAL PARA RESTAURAR DEPOIS DO LOGIN
        sessionStorage.setItem('pending_booking', JSON.stringify({
            serviceId: selectedService,
            barberId: selectedBarber,
            date: selectedDate,
            time: selectedTime
        }));
        setShowAuthModal(true); 
        return; 
    }

    const newAppointment = {
      serviceId: selectedService,
      barberId: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      status: 'pending' as const,
      userId: user.id,
      customerName: user.name
    };

    try {
        const newAppointmentId = await api.createAppointment(newAppointment);
        
        if (!newAppointmentId) {
          addToast("Ops! Alguém acabou de reservar este horário. Tente outro.", "error");
          // Recarregar slots
          const updatedSlots = await api.getAvailableSlots(selectedBarber, selectedDate);
          setAvailableTimes(updatedSlots);
          setSelectedTime(null);
          return;
        }
        
        // Redireciona para os detalhes do agendamento com uma flag de sucesso
        navigate(`/appointment/${newAppointmentId}`, { state: { bookingSuccess: true, from: '/' } });
    } catch (error) {
        addToast("Não foi possível completar o agendamento. Tente novamente.", "error");
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col max-w-2xl mx-auto pb-32 animate-fade-in">
      <div className="mb-8 px-1">
        <h2 className="text-3xl font-serif text-white mb-2 font-bold tracking-tight">Agendar Horário</h2>
        <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-zinc-600">
          <span className={step >= 1 ? 'text-gold-500' : ''}>01. SERVIÇO</span>
          <span className="w-4 h-[1px] bg-zinc-800"></span>
          <span className={step >= 2 ? 'text-gold-500' : ''}>02. BARBEIRO</span>
          <span className="w-4 h-[1px] bg-zinc-800"></span>
          <span className={step >= 3 ? 'text-gold-500' : ''}>03. DATA E HORA</span>
        </div>
      </div>

      <div className="flex-1">
        {step === 1 && (
          <div className="space-y-4 animate-slide-in">
             {services.length === 0 ? (
                 <div className="text-center py-10 text-zinc-500 text-xs">Carregando serviços...</div>
             ) : (
                 services.map(service => (
                   <button key={service.id} onClick={() => setSelectedService(service.id)} className={`text-left p-6 rounded-[2rem] border w-full transition-all duration-300 ${selectedService === service.id ? 'bg-zinc-800 border-gold-600 shadow-xl' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}>
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-serif text-xl font-bold text-white">{service.name}</span>
                       <span className="text-gold-500 font-black text-lg">R$ {service.price}</span>
                     </div>
                     <p className="text-zinc-400 text-sm">{service.description}</p>
                   </button>
                 ))
             )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-in">
            {barbers.length === 0 ? (
                <div className="text-center p-10 text-zinc-500 text-xs">Carregando barbeiros...</div>
            ) : (
                barbers.map(barber => (
                <button key={barber.id} onClick={() => setSelectedBarber(barber.id)} className={`flex items-center p-5 rounded-[2rem] border w-full transition-all duration-300 ${selectedBarber === barber.id ? 'bg-zinc-800 border-gold-600 shadow-xl' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}>
                    <img src={barber.avatarUrl} className="w-16 h-16 rounded-full object-cover grayscale" />
                    <div className="ml-5 text-left flex-1">
                    <h4 className="font-bold text-lg text-white">{barber.name}</h4>
                    <p className="text-gold-500 text-xs font-bold uppercase">{barber.specialty}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-black text-gold-500"><Star size={12} fill="currentColor"/> {barber.rating}</div>
                </button>
                ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-in">
             <div className="flex items-center justify-between mb-4 px-1">
               <h3 className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Escolha o Período</h3>
               <div className="flex gap-2">
                 <select value={selectedPeriod.month} onChange={e => setSelectedPeriod({...selectedPeriod, month: parseInt(e.target.value)})} className="bg-zinc-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg outline-none text-gold-500 border border-zinc-800">
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                 </select>
                 <select value={selectedPeriod.year} onChange={e => setSelectedPeriod({...selectedPeriod, year: parseInt(e.target.value)})} className="bg-zinc-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg outline-none text-gold-500 border border-zinc-800">
                    {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
             </div>

             <div className="overflow-x-auto pb-4 scrollbar-slim -mx-2 px-2 flex gap-3">
              {dateOptions.length === 0 ? (
                <div className="w-full py-12 flex flex-col items-center justify-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest text-center px-6">
                    Nenhuma data disponível para o período selecionado
                  </p>
                </div>
              ) : (
                dateOptions.map((date) => (
                  <button 
                    key={date.iso} 
                    onClick={() => { setSelectedDate(date.iso); setSelectedTime(null); }} 
                    className={`flex flex-col items-center min-w-[64px] py-5 rounded-2xl border transition-all duration-300 ${selectedDate === date.iso ? 'bg-gold-600 text-black border-gold-500 shadow-xl scale-105' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                  >
                    <span className="text-[10px] font-black uppercase mb-1">{date.dayName}</span>
                    <span className="text-lg font-bold leading-none">{date.dayNum}</span>
                  </button>
                ))
              )}
             </div>
             
             {/* SÓ MOSTRA HORÁRIOS SE HOUVER UMA DATA SELECIONADA */}
             {selectedDate !== '' && (
               <>
                  <div className="flex justify-between items-end mb-2 px-1">
                    <h3 className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Horários Disponíveis</h3>
                    {selectedDate === todayIso && (
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-bold text-zinc-600 uppercase">(Horários passados ocultos)</span>
                           <span className="text-[9px] font-bold text-gold-600 uppercase bg-gold-600/10 px-2 py-0.5 rounded">Hoje</span>
                        </div>
                    )}
                  </div>
                  
                  {loadingTime ? (
                      <div className="text-center py-10"><div className="inline-block w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : availableTimes.length === 0 ? (
                      <div className="text-center p-12 bg-zinc-900/50 rounded-[2.5rem] border border-dashed border-zinc-800 opacity-60 animate-fade-in">
                        <Clock size={40} className="mx-auto text-zinc-600 mb-3" />
                        <p className="text-zinc-400 font-bold mb-1 text-sm">
                            {selectedDate === todayIso ? 'Horários esgotados para hoje.' : 'Sem horários para este dia.'}
                        </p>
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Tente selecionar outra data.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {availableTimes.map(time => (
                          <button 
                            key={time} 
                            onClick={() => setSelectedTime(time)} 
                            className={`py-4 rounded-xl border text-sm font-black transition-all duration-300 ${selectedTime === time ? 'bg-gold-600 text-black border-gold-600 shadow-lg scale-105' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                  )}
               </>
             )}
          </div>
        )}
      </div>

      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-zinc-800/50 flex justify-between items-center px-4 py-4 z-[45] md:relative md:bg-transparent md:border-0 md:px-0 md:mt-10">
        <button onClick={() => step > 1 ? setStep(step-1) : navigate('/')} className="px-6 py-4 rounded-xl text-zinc-500 flex items-center font-black uppercase text-xs tracking-widest">
          <ChevronLeft size={20} className="mr-2" /> {step === 1 ? 'Sair' : 'Voltar'}
        </button>
        <button disabled={(step === 1 && !selectedService) || (step === 2 && !selectedBarber) || (step === 3 && !selectedTime)} onClick={step === 3 ? handleBooking : () => setStep(step+1)} className={`px-10 py-4 rounded-xl bg-gold-600 text-black font-black uppercase text-xs tracking-widest flex items-center shadow-xl active:scale-95 disabled:opacity-30 transition-all`}>
          {step === 3 ? 'Confirmar' : 'Próximo'} <ChevronRight size={20} className="ml-2" />
        </button>
      </div>

      {showAuthModal && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border border-zinc-800">
             <div className="w-20 h-20 bg-gold-600/10 border border-gold-600/30 rounded-full flex items-center justify-center mx-auto mb-6 text-gold-500"><LogIn size={40} /></div>
             <h3 className="text-2xl font-serif text-white mb-3 font-bold">Por ordem dos Peaky Blinders</h3>
             <p className="text-zinc-400 text-sm mb-8 leading-relaxed">Para garantir seu horário com nossos mestres, você precisa estar logado no sistema.</p>
             <div className="flex flex-col gap-3">
               <button onClick={() => navigate('/login')} className="w-full py-4 bg-gold-600 text-black font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg">Entrar Agora</button>
               <button onClick={() => navigate('/register')} className="w-full py-4 bg-zinc-800 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-zinc-700">Criar Conta</button>
               <button onClick={() => setShowAuthModal(false)} className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-2">Agora não</button>
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
