
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { ChevronRight, Calendar as CalendarIcon, ChevronLeft, LogIn, Clock, Scissors, Star } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import { Appointment, Service, Barber } from '../types';

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  
  const today = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: today.getMonth(),
    year: today.getFullYear()
  });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const dateOptions = useMemo(() => {
    const dates = [];
    const daysInMonth = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(selectedPeriod.year, selectedPeriod.month, i);
      const iso = d.toISOString().split('T')[0];
      
      const comparisonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Filtro inteligente: Só mostra o dia se for futuro E o barbeiro tiver horas configuradas
      if (d >= comparisonToday) {
        if (selectedBarber) {
           const configHours = db.getBarberHoursForDate(selectedBarber, iso);
           if (configHours.length > 0) {
              dates.push({
                iso,
                dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
                dayNum: d.getDate()
              });
           }
        } else {
          // Se ainda não escolheu barbeiro, mostra todos os dias do mês
          dates.push({
            iso,
            dayName: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
            dayNum: d.getDate()
          });
        }
      }
    }
    return dates;
  }, [selectedPeriod, selectedBarber]);

  // LOGICA DE SELEÇÃO AUTOMÁTICA E LIMPEZA
  useEffect(() => {
    if (step === 3) {
      if (dateOptions.length > 0) {
        // Sempre que o período ou barbeiro muda, selecionamos o primeiro dia disponível
        const firstAvailable = dateOptions[0].iso;
        setSelectedDate(firstAvailable);
        setSelectedTime(null);
      } else {
        // Se não houver datas no período, limpamos TUDO para não sobrar rastro do mês anterior
        setSelectedDate('');
        setAvailableTimes([]);
        setSelectedTime(null);
      }
    }
  }, [dateOptions, step]);

  useEffect(() => {
    if (step === 3 && selectedBarber && selectedDate && selectedDate !== '') {
      let filtered = db.getAvailableSlots(selectedBarber, selectedDate);
      const todayIso = today.toISOString().split('T')[0];
      
      if (selectedDate === todayIso) {
        const now = new Date();
        filtered = filtered.filter(time => {
          const [h, m] = time.split(':').map(Number);
          return h > now.getHours() || (h === now.getHours() && m > now.getMinutes() + 15);
        });
      }
      
      // Forçar ordenação cronológica na visualização
      const sorted = [...filtered].sort((a, b) => a.localeCompare(b));
      setAvailableTimes(sorted);
      
      if (selectedTime && !sorted.includes(selectedTime)) setSelectedTime(null);
    } else if (selectedDate === '') {
      // Garantia extra: se não há data, não há horários
      setAvailableTimes([]);
    }
  }, [step, selectedBarber, selectedDate]);

  const handleBooking = () => {
    if (!user) { setShowAuthModal(true); return; }
    if (!selectedService || !selectedBarber || !selectedTime || !selectedDate) return;

    const newAppointment: Appointment = {
      id: Date.now().toString(),
      serviceId: selectedService,
      barberId: selectedBarber,
      date: selectedDate,
      time: selectedTime,
      status: 'pending',
      userId: user.id,
      customerName: user.name,
      createdAt: new Date().toISOString()
    };

    const success = db.createAppointment(newAppointment);
    if (!success) {
      alert("Conflito! Este horário já não está mais disponível. Por favor, escolha outro.");
      return;
    }
    navigate('/profile');
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
             {db.getServices().map(service => (
               <button key={service.id} onClick={() => setSelectedService(service.id)} className={`text-left p-6 rounded-[2rem] border w-full transition-all duration-300 ${selectedService === service.id ? 'bg-zinc-800 border-gold-600 shadow-xl' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}>
                 <div className="flex justify-between items-center mb-2">
                   <span className="font-serif text-xl font-bold text-white">{service.name}</span>
                   <span className="text-gold-500 font-black text-lg">R$ {service.price}</span>
                 </div>
                 <p className="text-zinc-400 text-sm">{service.description}</p>
               </button>
             ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-in">
            {db.getBarbers().map(barber => (
              <button key={barber.id} onClick={() => setSelectedBarber(barber.id)} className={`flex items-center p-5 rounded-[2rem] border w-full transition-all duration-300 ${selectedBarber === barber.id ? 'bg-zinc-800 border-gold-600 shadow-xl' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}>
                <img src={barber.avatar} className="w-16 h-16 rounded-full object-cover grayscale" />
                <div className="ml-5 text-left flex-1">
                  <h4 className="font-bold text-lg text-white">{barber.name}</h4>
                  <p className="text-gold-500 text-xs font-bold uppercase">{barber.specialty}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-gold-500"><Star size={12} fill="currentColor"/> {barber.rating}</div>
              </button>
            ))}
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
                    className={`flex flex-col items-center min-w-[64px] py-5 rounded-2xl border transition-all duration-300 ${selectedDate === date.iso ? 'bg-gold-500 text-black border-gold-500 shadow-xl scale-105' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
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
                  <h3 className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-2 px-1">Horários Disponíveis</h3>
                  {availableTimes.length === 0 ? (
                      <div className="text-center p-12 bg-zinc-900/50 rounded-[2.5rem] border border-dashed border-zinc-800 opacity-50">
                        <p className="text-zinc-500 font-bold mb-1">Sem horários para este dia.</p>
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">O mestre barbeiro não possui expediente ativo</p>
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
        <button onClick={() => step > 1 ? setStep(step-1) : navigate(-1)} className="px-6 py-4 rounded-xl text-zinc-500 flex items-center font-black uppercase text-xs tracking-widest">
          <ChevronLeft size={20} className="mr-2" /> {step === 1 ? 'Sair' : 'Voltar'}
        </button>
        <button disabled={(step === 1 && !selectedService) || (step === 2 && !selectedBarber) || (step === 3 && !selectedTime)} onClick={step === 3 ? handleBooking : () => setStep(step+1)} className={`px-10 py-4 rounded-xl bg-gold-600 text-black font-black uppercase text-xs tracking-widest flex items-center shadow-xl active:scale-95 disabled:opacity-30 transition-all`}>
          {step === 3 ? 'Confirmar' : 'Próximo'} <ChevronRight size={20} className="ml-2" />
        </button>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
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
        </div>
      )}
    </div>
  );
};
