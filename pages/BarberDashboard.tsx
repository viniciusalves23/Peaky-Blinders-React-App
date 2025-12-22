
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, MessageSquare, Clock, Check, X, Shield, Settings, ChevronRight, AlertCircle, Save, ChevronLeft, CheckCircle2, Plus, User as UserIcon, CalendarDays, Power, AlertTriangle, Filter } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import { Appointment, User, Service } from '../types';

export const BarberDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>(db.getAppointments());
  const [view, setView] = useState<'hoje' | 'solicitacoes' | 'agenda_geral' | 'clientes' | 'config'>('hoje');
  
  const todayIso = new Date().toISOString().split('T')[0];
  
  // Identifica dinamicamente qual barbeiro é o usuário logado
  const myBarberId = useMemo(() => {
    const barber = db.getBarbers().find(b => b.userId === user?.id);
    return barber?.id || 'b1'; 
  }, [user]);

  // Estados de Controle
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<string[]>([]);
  const [configDate, setConfigDate] = useState(todayIso);
  const [isFullAbsence, setIsFullAbsence] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false); // Novo estado para filtro
  
  // Estados de Conflito de Agenda
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictAppts, setConflictAppts] = useState<Appointment[]>([]);
  const [cancellationReason, setCancellationReason] = useState('');

  // Estados para a Agenda Geral (Timeline)
  const [agendaPeriod, setAgendaPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(null);

  // Modal Reserva Manual
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [manualData, setManualData] = useState({ userId: '', guestName: '', serviceId: '1', date: todayIso, time: '' });

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Sincronização de dados
  const refreshData = () => {
    setAppointments(db.getAppointments());
  };

  useEffect(() => {
    loadSettings(configDate);
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [configDate]);

  const loadSettings = (date: string) => {
    const hours = db.getBarberHoursForDate(myBarberId, date);
    setWorkingHours(hours);
    setIsFullAbsence(hours.length === 0);
  };

  // Listas Filtradas
  const myAppointments = useMemo(() => appointments.filter(a => a.barberId === myBarberId), [appointments, myBarberId]);
  const pendingRequestsCount = useMemo(() => myAppointments.filter(a => a.status === 'pending').length, [myAppointments]);

  const hojeList = useMemo(() => {
    return myAppointments
      .filter(a => {
        const isToday = a.date === todayIso;
        if (!isToday) return false;

        // Se o filtro "Ver Tudo" estiver ativo, mostra Confirmed, Completed, Cancelled
        if (showAllHistory) {
          return a.status !== 'pending'; // Pendente fica na aba de solicitações
        }
        
        // Por padrão, mostra apenas o que precisa ser feito (Confirmed)
        return a.status === 'confirmed';
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [myAppointments, todayIso, showAllHistory]);

  const solicitacoesList = useMemo(() => {
    return myAppointments
      .filter(a => a.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [myAppointments]);

  // LOGICA DA TIMELINE
  const monthAppointments = useMemo(() => {
    return myAppointments.filter(a => {
        const [y, m, d] = a.date.split('-').map(Number);
        const isMonth = y === agendaPeriod.year && (m - 1) === agendaPeriod.month;
        
        if (!isMonth) return false;
        if (a.status === 'pending') return false; // Pendente na aba solicitações

        // LÓGICA CORRIGIDA:
        // Se filtro ATIVO: Mostra tudo (Confirmed, Completed, Cancelled)
        if (showAllHistory) return true; 
        
        // Se filtro INATIVO: Mostra APENAS CONFIRMED (Agenda limpa, apenas o que vai acontecer)
        return a.status === 'confirmed';
    });
  }, [myAppointments, agendaPeriod, showAllHistory]);

  const distinctDates = useMemo(() => {
    const dates = Array.from(new Set(monthAppointments.map(a => a.date))).sort() as string[];
    return dates.map(date => {
         const [y, m, d] = date.split('-').map(Number);
         const dateObj = new Date(y, m-1, d);
         return {
             iso: date,
             dayNum: d,
             dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
         };
    });
  }, [monthAppointments]);

  useEffect(() => {
     if (distinctDates.length > 0) {
         if (!selectedTimelineDate || !distinctDates.find(d => d.iso === selectedTimelineDate)) {
             setSelectedTimelineDate(distinctDates[0].iso);
         }
     } else {
         setSelectedTimelineDate(null);
     }
  }, [distinctDates, selectedTimelineDate]);

  const activeDayAppointments = useMemo(() => {
    if (!selectedTimelineDate) return [];
    return monthAppointments
        .filter(a => a.date === selectedTimelineDate)
        .sort((a, b) => a.time.localeCompare(b.time));
  }, [monthAppointments, selectedTimelineDate]);


  // Ações
  const updateStatus = (id: string, status: Appointment['status'], reason?: string) => {
    db.updateAppointmentStatus(id, status, reason);
    refreshData();
    if (status === 'confirmed') {
      setSaveSuccess("Agendamento Confirmado!");
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const openManualBooking = (date: string, lock: boolean) => {
    setManualData({ userId: '', guestName: '', serviceId: '1', date: date, time: '' });
    setIsDateLocked(lock);
    setShowManualBooking(true);
  };

  const toggleHour = (h: string) => {
    if (isFullAbsence) return; // Bloqueado se estiver em ausência total
    setWorkingHours(prev => {
      const newHours = prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h];
      return newHours.sort((a, b) => a.localeCompare(b));
    });
  };

  const toggleAbsence = () => {
    const newState = !isFullAbsence;
    setIsFullAbsence(newState);
    if (newState) {
      setWorkingHours([]); // Limpa se for ausência
    } else {
      // Opcional: Restaurar padrão se desejar, mas deixar vazio para preencher manualmente é mais seguro
      setWorkingHours(db.getBarberSettings(myBarberId).defaultHours || []);
    }
  };

  const handlePreSaveExpediente = () => {
    // 1. Identificar agendamentos ativos na data configurada
    const activeApptsOnDate = myAppointments.filter(a => 
      a.date === configDate && 
      (a.status === 'confirmed' || a.status === 'pending')
    );

    // 2. Verificar quais serão afetados (horário removido)
    const conflicts = activeApptsOnDate.filter(a => !workingHours.includes(a.time));

    if (conflicts.length > 0) {
      setConflictAppts(conflicts);
      setShowConflictModal(true);
    } else {
      commitSaveExpediente();
    }
  };

  const commitSaveExpediente = (reason?: string) => {
    db.saveBarberSettingsForDate(myBarberId, configDate, workingHours, reason);
    setShowConflictModal(false);
    setCancellationReason('');
    setConflictAppts([]);
    setSaveSuccess(`Expediente de ${new Date(configDate + 'T12:00:00').toLocaleDateString()} atualizado!`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleManualBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const newAppt: Appointment = {
      id: Date.now().toString(),
      userId: isGuest ? `guest_${Date.now()}` : manualData.userId,
      customerName: isGuest ? manualData.guestName : db.getUsers().find(u => u.id === manualData.userId)?.name || 'Cliente',
      barberId: myBarberId,
      serviceId: manualData.serviceId,
      date: manualData.date,
      time: manualData.time,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    if (db.createAppointment(newAppt)) {
      refreshData();
      setShowManualBooking(false);
      setSaveSuccess("Lançamento Realizado!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } else {
      alert("Conflito de horário! Verifique se já existe alguém neste período.");
    }
  };

  // Helper para renderizar classes de status visualmente
  const getApptCardStyles = (status: Appointment['status']) => {
    if (status === 'completed') return 'opacity-60 border-green-900/50 bg-green-900/10';
    if (status === 'cancelled') return 'opacity-50 border-red-900/50 bg-red-900/10 grayscale';
    return 'bg-zinc-900 border-zinc-800 hover:border-gold-500/30'; // Confirmed/Standard
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-2xl mx-auto">
      {saveSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-[90%] max-w-sm animate-bounce-in">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-500">
            <CheckCircle2 size={24} />
            <p className="text-xs font-black uppercase tracking-wider">{saveSuccess}</p>
          </div>
        </div>
      )}

      {/* Header Centralizado */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
            <Shield size={160} className="text-gold-500" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h2 className="text-xl font-serif font-bold text-white tracking-wide">Comandante {user?.name.split(' ')[0]}</h2>
            <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Posto de Comando Ativo</p>
            </div>
          </div>
          <button onClick={() => setView('config')} className={`p-3 rounded-xl transition-all ${view === 'config' ? 'bg-gold-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400'}`}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Navegação de Abas Principal */}
      {view !== 'config' && (
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-slim shadow-inner relative">
          <button onClick={() => setView('hoje')} className={`flex-1 min-w-[90px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'hoje' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}>Visão Diária</button>
          <button onClick={() => setView('solicitacoes')} className={`flex-1 min-w-[110px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${view === 'solicitacoes' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}>
            Solicitações {pendingRequestsCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-600 rounded-full border border-white dark:border-zinc-900 animate-pulse"></span>}
          </button>
          <button onClick={() => setView('agenda_geral')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'agenda_geral' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}>Toda Agenda</button>
          <button onClick={() => setView('clientes')} className={`flex-1 min-w-[90px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'clientes' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}>Clientes</button>
        </div>
      )}

      {/* Conteúdo das Abas */}
      <div className="min-h-[400px]">
        {view === 'hoje' && (
          <div className="space-y-4 animate-fade-in">
             <div className="px-1 flex justify-between items-center">
               <h3 className="font-serif font-bold text-lg">Fila do Dia</h3>
               <div className="flex gap-2">
                 {/* Botão de Filtro */}
                 <button 
                   onClick={() => setShowAllHistory(!showAllHistory)} 
                   className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-md ${showAllHistory ? 'bg-gold-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                   title={showAllHistory ? "Ocultar Concluídos/Cancelados" : "Ver Todo Histórico"}
                 >
                    <Filter size={16} />
                 </button>
                 <button onClick={() => openManualBooking(todayIso, true)} className="w-8 h-8 bg-gold-600 text-white rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <Plus size={18} strokeWidth={3} />
                 </button>
               </div>
            </div>
            {hojeList.length === 0 ? (
              <div className="py-24 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800 opacity-60">
                 <Clock size={48} className="mx-auto text-zinc-400 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   {showAllHistory ? 'Nenhum registro para hoje' : 'Nenhum serviço pendente para hoje'}
                 </p>
              </div>
            ) : (
              hojeList.map(apt => (
                <div key={apt.id} onClick={() => navigate(`/appointment/${apt.id}`)} className={`${getApptCardStyles(apt.status)} border p-5 rounded-3xl shadow-sm transition-all cursor-pointer group flex items-center gap-4`}>
                   <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border border-zinc-800 ${apt.status === 'cancelled' ? 'bg-red-900/20' : 'bg-black'}`}>
                      <span className={`text-sm font-black ${apt.status === 'cancelled' ? 'text-red-500 line-through' : 'text-white'}`}>{apt.time}</span>
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center">
                         <h4 className={`font-bold text-xs uppercase ${apt.status === 'cancelled' ? 'text-red-400' : 'text-white'} group-hover:text-gold-600 transition-colors`}>{apt.customerName}</h4>
                         {apt.status !== 'confirmed' && (
                           <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${apt.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                             {apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                           </span>
                         )}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{db.getServices().find(s => s.id === apt.serviceId)?.name}</p>
                   </div>
                   <ChevronRight size={16} className="text-zinc-400" />
                </div>
              ))
            )}
          </div>
        )}

        {view === 'solicitacoes' && (
          <div className="space-y-4 animate-fade-in">
            <div className="px-1">
               <h3 className="font-serif font-bold text-lg">Novos Chamados</h3>
            </div>
            {solicitacoesList.length === 0 ? (
               <div className="py-24 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800 opacity-60">
                  <CheckCircle2 size={48} className="mx-auto text-zinc-400 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma solicitação pendente.</p>
               </div>
            ) : (
              solicitacoesList.map(apt => (
                <div key={apt.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[9px] font-black uppercase text-gold-600 mb-1">{apt.customerName}</p>
                      <h4 className="font-serif font-bold text-lg text-white">{db.getServices().find(s => s.id === apt.serviceId)?.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{new Date(apt.date + 'T12:00:00').toLocaleDateString()} às {apt.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => updateStatus(apt.id, 'confirmed')} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Aprovar</button>
                    <button onClick={() => updateStatus(apt.id, 'cancelled', 'Recusado pelo barbeiro')} className="flex-1 py-3 bg-red-600/20 text-red-500 border border-red-600/30 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Recusar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === 'agenda_geral' && (
           <div className="space-y-4 animate-fade-in relative min-h-[500px]">
              
              {/* Barra de Ferramentas Organizada - Substituindo os botões flutuantes e os controles antigos */}
              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-3xl shadow-lg flex flex-col gap-3">
                 <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-lg text-white">Timeline Geral</h3>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => setShowAllHistory(!showAllHistory)}
                         className={`h-9 px-4 rounded-xl flex items-center justify-center shadow-lg transition-all text-[10px] font-black uppercase tracking-wider ${showAllHistory ? 'bg-gold-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'}`}
                       >
                          <Filter size={14} className="mr-2" /> {showAllHistory ? 'Filtrar' : 'Histórico'}
                       </button>
                       <button onClick={() => openManualBooking(todayIso, false)} className="h-9 w-9 bg-gold-600 rounded-xl text-white flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.3)] hover:scale-110 transition-transform">
                          <Plus size={18} strokeWidth={3} />
                       </button>
                    </div>
                 </div>
                 
                 <div className="flex gap-2">
                    <select value={agendaPeriod.month} onChange={e => setAgendaPeriod({...agendaPeriod, month: parseInt(e.target.value)})} className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase text-zinc-400 outline-none focus:border-gold-600 focus:text-gold-600 transition-colors">
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={agendaPeriod.year} onChange={e => setAgendaPeriod({...agendaPeriod, year: parseInt(e.target.value)})} className="w-24 bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase text-zinc-400 outline-none focus:border-gold-600 focus:text-gold-600 transition-colors">
                       {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>

              {/* Split View Content */}
              {distinctDates.length === 0 ? (
                  <div className="text-center py-24 opacity-50 bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-800 mt-2">
                     <CalendarDays size={48} className="mx-auto text-zinc-600 mb-4"/>
                     <p className="text-sm font-black uppercase text-zinc-500 tracking-widest">
                       {showAllHistory ? 'Nenhum registro no mês' : 'Agenda Limpa'}
                     </p>
                     {!showAllHistory && <p className="text-[10px] text-zinc-600 mt-1">Ative o histórico para ver concluídos/cancelados</p>}
                  </div>
              ) : (
                  <div className="flex gap-4 pt-2 h-[500px]">
                      {/* Left Column: Dates (Scrollable) */}
                      <div className="w-20 shrink-0 overflow-y-auto scrollbar-slim space-y-3 pb-4">
                          {distinctDates.map(d => (
                              <button 
                                key={d.iso}
                                onClick={() => setSelectedTimelineDate(d.iso)}
                                className={`w-full flex flex-col items-center py-3 rounded-2xl transition-all ${
                                    selectedTimelineDate === d.iso 
                                    ? 'bg-gold-600 text-black shadow-lg scale-105' 
                                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                                }`}
                              >
                                  <span className="text-[8px] font-black uppercase mb-1">{d.dayName}</span>
                                  <span className="text-xl font-bold leading-none">{d.dayNum}</span>
                              </button>
                          ))}
                      </div>

                      {/* Right Column: Appointments for selected date (Scrollable) */}
                      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                          <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 px-1">
                              {selectedTimelineDate && new Date(selectedTimelineDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </p>
                          {activeDayAppointments.map(apt => (
                             <div key={apt.id} onClick={() => navigate(`/appointment/${apt.id}`)} className={`${getApptCardStyles(apt.status)} border p-5 rounded-2xl flex items-center justify-between group cursor-pointer shadow-md relative overflow-hidden transition-all`}>
                                 <div className="flex items-center gap-4 z-10">
                                     <span className={`font-bold text-sm font-mono tracking-tighter ${apt.status === 'cancelled' ? 'text-red-500 line-through' : 'text-gold-500'}`}>{apt.time}</span>
                                     <div className="w-px h-4 bg-zinc-800"></div>
                                     <h4 className={`font-black uppercase text-xs tracking-wider ${apt.status === 'cancelled' ? 'text-red-400' : 'text-white'}`}>{apt.customerName}</h4>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   {apt.status !== 'confirmed' && (
                                     <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${apt.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {apt.status === 'completed' ? 'Conc' : 'Canc'}
                                     </span>
                                   )}
                                   <div className="px-2 py-1 bg-black/40 rounded border border-zinc-800">
                                       <span className="text-[8px] font-black text-gold-600 uppercase tracking-widest">
                                          {db.getServices().find(s => s.id === apt.serviceId)?.name.split(' ')[0]}
                                       </span>
                                   </div>
                                 </div>
                             </div>
                          ))}
                      </div>
                  </div>
              )}
           </div>
        )}

        {view === 'clientes' && (
           <div className="space-y-4 animate-fade-in">
              <div className="px-1">
                 <h3 className="font-serif font-bold text-lg">Membros do Clube</h3>
              </div>
              {db.getUsers().filter(u => u.role === 'customer').map(c => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex items-center gap-4">
                   <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-gold-500 font-serif font-bold text-xl uppercase">{c.name.charAt(0)}</div>
                   <div className="flex-1">
                      <h4 className="text-sm font-bold text-white uppercase">{c.name}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{c.loyaltyStamps} Cortes no Cartão</p>
                   </div>
                   <button onClick={() => navigate(`/chat/${c.id}`)} className="p-3 bg-zinc-800 text-zinc-400 rounded-xl hover:text-gold-500 transition-colors">
                      <MessageSquare size={18} />
                   </button>
                </div>
              ))}
           </div>
        )}

        {view === 'config' && (
          <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex items-center gap-4 px-1">
              <button onClick={() => setView('hoje')} className="p-2 bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-serif font-bold text-xl text-white">Configurar Agenda</h3>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 space-y-8 shadow-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500 mb-4">Selecione a Data</p>
                <input type="date" value={configDate} onChange={(e) => setConfigDate(e.target.value)} min={todayIso} className="w-full bg-black border border-zinc-800 rounded-2xl p-5 text-sm font-bold text-gold-500 outline-none" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] font-black uppercase text-zinc-500">Disponibilidade</p>
                   <button 
                     onClick={toggleAbsence}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ${
                       isFullAbsence 
                         ? 'bg-red-600/20 text-red-500 border-red-600/50' 
                         : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-white'
                     }`}
                   >
                     <Power size={12} /> {isFullAbsence ? 'Ausência Ativa' : 'Definir Ausência Total'}
                   </button>
                </div>

                <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${isFullAbsence ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map(h => (
                    <button key={h} onClick={() => toggleHour(h)} className={`py-4 rounded-xl border text-[10px] font-black transition-all ${workingHours.includes(h) ? 'bg-gold-600 text-black border-gold-600 shadow-md scale-105' : 'bg-black border-zinc-800 text-zinc-600'}`}>
                      {h}
                    </button>
                  ))}
                </div>
                {isFullAbsence && <p className="text-center text-xs text-red-500 mt-4 font-bold">Todos os horários desabilitados para este dia.</p>}
              </div>

              <button onClick={handlePreSaveExpediente} className="w-full py-5 bg-gold-600 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Reserva Manual */}
      {showManualBooking && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
           <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                 <div>
                   <h3 className="text-xl font-serif font-bold text-white">Lançamento Direto</h3>
                   <p className="text-[9px] font-black uppercase text-gold-600 mt-1">{isDateLocked ? 'Agendamento para HOJE' : 'Agendamento Calendário'}</p>
                 </div>
                 <button onClick={() => setShowManualBooking(false)} className="text-zinc-500"><X size={24}/></button>
              </div>
              <form onSubmit={handleManualBooking} className="p-8 space-y-6">
                 <div className="flex items-center gap-4 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <button type="button" onClick={() => setIsGuest(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!isGuest ? 'bg-zinc-800 text-gold-600' : 'text-zinc-500'}`}>Membro</button>
                    <button type="button" onClick={() => setIsGuest(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isGuest ? 'bg-zinc-800 text-gold-600' : 'text-zinc-500'}`}>Externo</button>
                 </div>
                 {isGuest ? (
                   <input required type="text" placeholder="Nome do Cliente" value={manualData.guestName} onChange={e => setManualData({...manualData, guestName: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-gold-600" />
                 ) : (
                   <select required value={manualData.userId} onChange={e => setManualData({...manualData, userId: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-gold-600">
                     <option value="">Selecione o Cliente</option>
                     {db.getUsers().filter(u => u.role === 'customer').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 )}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                       <input 
                         required 
                         type="date" 
                         disabled={isDateLocked} 
                         value={manualData.date} 
                         onChange={e => setManualData({...manualData, date: e.target.value})} 
                         className={`w-full bg-black border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-gold-600 ${isDateLocked ? 'opacity-50 grayscale' : ''}`} 
                       />
                       {isDateLocked && <div className="absolute inset-0 z-10"></div>}
                    </div>
                    <select required value={manualData.time} onChange={e => setManualData({...manualData, time: e.target.value})} className="bg-black border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-gold-600">
                        <option value="">Hora</option>
                        {db.getAvailableSlots(myBarberId, manualData.date).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="w-full py-5 bg-gold-600 text-black rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all">Registrar Agendamento</button>
              </form>
           </div>
        </div>
      )}

      {/* Modal de Conflito ao Salvar */}
      {showConflictModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] border border-red-900/50 shadow-2xl overflow-hidden">
             <div className="p-8 text-center space-y-4">
               <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-900/50">
                  <AlertTriangle size={32} />
               </div>
               <h3 className="text-xl font-serif font-bold text-white">Conflito de Agenda</h3>
               <p className="text-zinc-400 text-sm leading-relaxed">
                 Você está removendo horários que já possuem <span className="text-white font-bold">{conflictAppts.length} agendamento(s)</span> ativo(s).
               </p>
               
               <div className="bg-black/50 p-4 rounded-xl text-left max-h-32 overflow-y-auto scrollbar-thin border border-zinc-800">
                  {conflictAppts.map(c => (
                    <div key={c.id} className="text-xs text-zinc-300 py-1 border-b border-zinc-800 last:border-0 flex justify-between">
                       <span>{c.customerName}</span>
                       <span className="font-bold text-gold-600">{c.time}</span>
                    </div>
                  ))}
               </div>

               <div className="text-left space-y-2">
                 <label className="text-[10px] font-black uppercase text-red-500 ml-1">Motivo do Cancelamento (Obrigatório)</label>
                 <textarea 
                   value={cancellationReason}
                   onChange={(e) => setCancellationReason(e.target.value)}
                   placeholder="Ex: Imprevisto pessoal, Manutenção..."
                   className="w-full bg-black border border-red-900/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 h-24 resize-none"
                 />
               </div>

               <div className="flex gap-3 pt-2">
                 <button onClick={() => setShowConflictModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Cancelar</button>
                 <button 
                   disabled={!cancellationReason.trim()}
                   onClick={() => commitSaveExpediente(cancellationReason)}
                   className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                 >
                   Confirmar
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};