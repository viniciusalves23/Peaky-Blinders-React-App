
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, MessageSquare, Clock, Check, X, Shield, Settings, ChevronRight, AlertCircle, Save, ChevronLeft, CheckCircle2, Plus, User as UserIcon, CalendarDays, Power, AlertTriangle, Filter } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import { Appointment, User, Service, Barber } from '../types';

export const BarberDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [view, setView] = useState<'hoje' | 'solicitacoes' | 'agenda_geral' | 'clientes' | 'config'>('hoje');
  
  const todayIso = new Date().toISOString().split('T')[0];
  
  // O ID do barbeiro é o próprio ID do usuário
  const myBarberId = user?.id || '';

  useEffect(() => {
    // Carregar dados
    api.getBarbers().then(setBarbers);
    api.getServices().then(setServices);
    api.getAllUsers().then(setUsersList);
  }, []);

  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<string[]>([]);
  const [configDate, setConfigDate] = useState(todayIso);
  const [isFullAbsence, setIsFullAbsence] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictAppts, setConflictAppts] = useState<Appointment[]>([]);
  const [cancellationReason, setCancellationReason] = useState('');
  const [agendaPeriod, setAgendaPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(null);
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [manualData, setManualData] = useState({ userId: '', guestName: '', serviceId: '', date: todayIso, time: '' });
  const [manualAvailableSlots, setManualAvailableSlots] = useState<string[]>([]);

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const refreshData = async () => {
    const appts = await api.getAppointments();
    setAppointments(appts);
  };

  useEffect(() => {
    if (!myBarberId) return;
    
    const fetchSettings = async () => {
      const settings = await api.getBarberSettings(myBarberId);
      const dateHours = settings.dates[configDate] !== undefined ? settings.dates[configDate] : settings.defaultHours;
      const sorted = [...dateHours].sort((a: string, b: string) => a.localeCompare(b));
      setWorkingHours(sorted);
      setIsFullAbsence(sorted.length === 0);
    };

    fetchSettings();
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [configDate, myBarberId]);

  useEffect(() => {
    if (showManualBooking && manualData.date && myBarberId) {
      api.getAvailableSlots(myBarberId, manualData.date).then(setManualAvailableSlots);
    }
  }, [showManualBooking, manualData.date, myBarberId]);

  const myAppointments = useMemo(() => appointments.filter(a => a.barberId === myBarberId), [appointments, myBarberId]);
  const pendingRequestsCount = useMemo(() => myAppointments.filter(a => a.status === 'pending').length, [myAppointments]);

  const hojeList = useMemo(() => {
    return myAppointments
      .filter(a => {
        const isToday = a.date === todayIso;
        if (!isToday) return false;
        if (showAllHistory) return a.status !== 'pending';
        return a.status === 'confirmed';
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [myAppointments, todayIso, showAllHistory]);

  const solicitacoesList = useMemo(() => {
    return myAppointments
      .filter(a => a.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [myAppointments]);

  const monthAppointments = useMemo(() => {
    return myAppointments.filter(a => {
        const [y, m, d] = a.date.split('-').map(Number);
        const isMonth = y === agendaPeriod.year && (m - 1) === agendaPeriod.month;
        if (!isMonth) return false;
        if (a.status === 'pending') return false; 
        if (showAllHistory) return true; 
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

  const updateStatus = async (id: string, status: Appointment['status'], reason?: string) => {
    await api.updateAppointmentStatus(id, status, reason);
    refreshData();
    if (status === 'confirmed') {
      setSaveSuccess("Agendamento Confirmado!");
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const openManualBooking = (date: string, lock: boolean) => {
    if (services.length > 0) {
        setManualData({ userId: '', guestName: '', serviceId: services[0].id, date: date, time: '' });
    }
    setIsDateLocked(lock);
    setShowManualBooking(true);
  };

  const toggleHour = (h: string) => {
    if (isFullAbsence) return; 
    setWorkingHours(prev => {
      const newHours = prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h];
      return newHours.sort((a, b) => a.localeCompare(b));
    });
  };

  const toggleAbsence = async () => {
    const newState = !isFullAbsence;
    setIsFullAbsence(newState);
    if (newState) {
      setWorkingHours([]);
    } else {
      const settings = await api.getBarberSettings(myBarberId);
      setWorkingHours(settings.defaultHours || []);
    }
  };

  const handlePreSaveExpediente = async () => {
    await api.saveBarberSettingsForDate(myBarberId, configDate, workingHours);
    setSaveSuccess("Agenda Atualizada");
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleManualBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualData.serviceId || !manualData.time) return;

    const guestUser = usersList.find(u => u.id === manualData.userId);

    const newAppt = {
      serviceId: manualData.serviceId,
      barberId: myBarberId,
      date: manualData.date,
      time: manualData.time,
      status: 'confirmed' as const,
      userId: isGuest ? (user?.id || 'admin') : manualData.userId,
      customerName: isGuest ? manualData.guestName : guestUser?.name || 'Cliente'
    };

    const success = await api.createAppointment(newAppt);

    if (success) {
      refreshData();
      setShowManualBooking(false);
      setSaveSuccess("Lançamento Realizado!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } else {
      alert("Erro ao criar agendamento. Verifique se o horário está livre.");
    }
  };

  if (!user || user.role !== 'barber') return null;

  const getApptCardStyles = (status: Appointment['status']) => {
    if (status === 'completed') return 'opacity-60 border-green-900/50 bg-green-900/10';
    if (status === 'cancelled') return 'opacity-50 border-red-900/50 bg-red-900/10 grayscale';
    return 'bg-zinc-900 border-zinc-800 hover:border-gold-500/30'; 
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

      {/* Navegação de Abas */}
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

      {/* Conteúdo */}
      <div className="min-h-[400px]">
        {view === 'hoje' && (
          <div className="space-y-4 animate-fade-in">
             <div className="px-1 flex justify-between items-center">
               <h3 className="font-serif font-bold text-lg">Fila do Dia</h3>
               <div className="flex gap-2">
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
                   {showAllHistory ? 'Nenhum registro para hoje' : 'Agenda Livre Hoje'}
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
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{services.find(s => s.id === apt.serviceId)?.name}</p>
                   </div>
                   <ChevronRight size={16} className="text-zinc-400" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Demais Views (Simplificadas para manter código) */}
        {view === 'solicitacoes' && (
          <div className="space-y-4 animate-fade-in">
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
                      <h4 className="font-serif font-bold text-lg text-white">{services.find(s => s.id === apt.serviceId)?.name}</h4>
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
                   <p className="text-[10px] font-black uppercase text-zinc-500">Horários Habilitados</p>
                   <button 
                     onClick={toggleAbsence}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ${
                       isFullAbsence 
                         ? 'bg-red-600/20 text-red-500 border-red-600/50' 
                         : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-white'
                     }`}
                   >
                     <Power size={12} /> {isFullAbsence ? 'Ausência Ativa' : 'Definir Ausência'}
                   </button>
                </div>

                <div className={`grid grid-cols-3 gap-3 transition-opacity duration-300 ${isFullAbsence ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map(h => (
                    <button key={h} onClick={() => toggleHour(h)} className={`py-4 rounded-xl border text-[10px] font-black transition-all ${workingHours.includes(h) ? 'bg-gold-600 text-black border-gold-600 shadow-md scale-105' : 'bg-black border-zinc-800 text-zinc-600'}`}>
                      {h}
                    </button>
                  ))}
                </div>
                {isFullAbsence && <p className="text-center text-xs text-red-500 mt-4 font-bold">Dia marcado como fechado.</p>}
              </div>

              <button onClick={handlePreSaveExpediente} className="w-full py-5 bg-gold-600 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Save size={18} /> Salvar Alterações
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* ... Modais ... */}
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
                     {usersList.filter(u => u.role === 'customer').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                        {manualAvailableSlots.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>
                 <button type="submit" className="w-full py-5 bg-gold-600 text-black rounded-2xl font-black uppercase text-[11px] shadow-xl active:scale-95 transition-all">Registrar Agendamento</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};
