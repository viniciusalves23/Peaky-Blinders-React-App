
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Calendar, Users, MessageSquare, Clock, Check, X, Shield, Settings, ChevronRight, AlertCircle, Save, ChevronLeft, CheckCircle2, Plus, User as UserIcon, CalendarDays, Power, AlertTriangle, Filter, Trash2, Repeat, Copy, History, RotateCcw } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, useLocation } = ReactRouterDOM;
import { Appointment, User, Service, Barber } from '../types';

// Sincronizado com API.ts
const SYSTEM_DEFAULT_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

export const BarberDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  
  // Recupera a aba inicial do estado da navegação ou usa 'hoje' como padrão
  const [view, setView] = useState<'hoje' | 'solicitacoes' | 'agenda_geral' | 'clientes' | 'config'>(
    (location.state as any)?.initialTab || 'hoje'
  );
  
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayIso = getLocalDateString(new Date());
  
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const myBarberId = user?.id || '';

  // Estados de Configuração de Agenda
  const [configDate, setConfigDate] = useState(todayIso);
  const [currentSettings, setCurrentSettings] = useState<{ defaultHours: string[], dates: Record<string, string[]> }>({ defaultHours: [], dates: {} });
  const [workingHours, setWorkingHours] = useState<string[]>([]); // Horas exibidas na tela (editáveis)
  const [isFullAbsence, setIsFullAbsence] = useState(false);
  const [isUsingDefault, setIsUsingDefault] = useState(true); // Se true, o dia está seguindo o padrão
  
  // Modal de Personalização e Conflitos
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  
  // Modal Unificado: Conflito OU Confirmação de Massa
  const [conflictModal, setConflictModal] = useState<{ 
    isOpen: boolean; 
    conflicts: Appointment[]; 
    pendingHours: string[]; 
    scope: 'day' | 'month' | 'default';
    type: 'conflict' | 'bulk_confirm'; // Novo tipo para diferenciar
  }>({
    isOpen: false, conflicts: [], pendingHours: [], scope: 'day', type: 'conflict'
  });

  // Modal de Recusa de Agendamento
  const [refusalModal, setRefusalModal] = useState<{ isOpen: boolean, apptId: string | null, reason: string }>({ 
    isOpen: false, apptId: null, reason: '' 
  });

  const [showAllHistory, setShowAllHistory] = useState(false);
  
  // Estados para Agendamento Manual
  const [showManualBooking, setShowManualBooking] = useState(false);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [manualData, setManualData] = useState({ userId: '', guestName: '', serviceId: '', date: todayIso, time: '' });
  const [manualAvailableSlots, setManualAvailableSlots] = useState<string[]>([]);

  // Estados RESTAURADOS para a Agenda Geral (Timeline)
  const [agendaPeriod, setAgendaPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<string | null>(todayIso);

  useEffect(() => {
    // Carregar dados iniciais
    api.getBarbers().then(setBarbers);
    api.getServices().then(setServices);
    api.getAllUsers().then(setUsersList);
  }, []);

  const refreshData = async () => {
    const appts = await api.getAppointments();
    setAppointments(appts);
  };

  useEffect(() => {
    if (!myBarberId) return;
    
    const fetchSettings = async () => {
      const settings = await api.getBarberSettings(myBarberId);
      setCurrentSettings(settings);
      
      // Lógica de Determinação de Horários
      let dateHours: string[] = [];
      let usingDefault = true;

      // Se existe uma chave específica para a data, usa-se ela
      if (settings.dates && Array.isArray(settings.dates[configDate])) {
        dateHours = settings.dates[configDate];
        usingDefault = false;
      } else {
        // Se não existe override, usamos o padrão salvo OU o padrão do sistema se estiver vazio
        dateHours = (settings.defaultHours && settings.defaultHours.length > 0) 
          ? settings.defaultHours 
          : SYSTEM_DEFAULT_HOURS;
        usingDefault = true;
      }
      
      const sorted = [...dateHours].sort((a: string, b: string) => a.localeCompare(b));
      setWorkingHours(sorted);
      setIsFullAbsence(sorted.length === 0);
      setIsUsingDefault(usingDefault);
    };

    fetchSettings();
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [configDate, myBarberId, view]); 

  // Lógica corrigida para filtrar horários passados no Lançamento Direto
  useEffect(() => {
    if (showManualBooking && manualData.date && myBarberId) {
      const fetchManualSlots = async () => {
        let slots = await api.getAvailableSlots(myBarberId, manualData.date);
        
        // Se a data do agendamento for hoje, remove horários que já passaram
        if (manualData.date === todayIso) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            
            slots = slots.filter(time => {
                const [h, m] = time.split(':').map(Number);
                // Permite apenas horários futuros (hora > atual) OU (hora == atual E minutos > atual)
                return h > currentHour || (h === currentHour && m > currentMinutes);
            });
        }
        setManualAvailableSlots(slots);
      };
      
      fetchManualSlots();
    }
  }, [showManualBooking, manualData.date, myBarberId, todayIso]);

  const myAppointments = useMemo(() => appointments.filter(a => a.barberId === myBarberId), [appointments, myBarberId]);
  const pendingRequestsCount = useMemo(() => myAppointments.filter(a => a.status === 'pending').length, [myAppointments]);

  // --- FILTROS DE VISUALIZAÇÃO ---

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

  // --- LOGICA DA TIMELINE (Agenda Geral) ---
  const monthAppointments = useMemo(() => {
    return myAppointments.filter(a => {
        const [y, m, d] = a.date.split('-').map(Number);
        // Exibe TODOS os status (cancelados, concluidos, etc)
        return y === agendaPeriod.year && (m - 1) === agendaPeriod.month;
    });
  }, [myAppointments, agendaPeriod]);

  // GERA TODOS OS DIAS DO MÊS (1 a 30/31)
  const allDaysInMonth = useMemo(() => {
    const daysInMonth = new Date(agendaPeriod.year, agendaPeriod.month + 1, 0).getDate();
    const days = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(agendaPeriod.year, agendaPeriod.month, i);
        // Construção manual da string ISO local para evitar problemas de timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const iso = `${year}-${month}-${day}`;

        // Verifica se tem agendamento neste dia para marcação visual (opcional)
        const hasAppts = monthAppointments.some(a => a.date === iso && a.status !== 'cancelled');

        days.push({
            iso: iso,
            dayNum: i,
            dayName: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
            hasData: hasAppts
        });
    }
    return days;
  }, [agendaPeriod, monthAppointments]);

  // Efeito para selecionar o dia correto e rolar a timeline
  useEffect(() => {
     // Apenas executa a lógica se estiver na visualização da agenda geral
     if (view === 'agenda_geral') {
         const currentMonthIso = `${agendaPeriod.year}-${String(agendaPeriod.month + 1).padStart(2, '0')}`;
         const todayParts = todayIso.split('-');
         const todayMonthIso = `${todayParts[0]}-${todayParts[1]}`;

         let targetDate = '';

         if (currentMonthIso === todayMonthIso) {
             // Se estamos vendo o mês atual, foca no HOJE
             targetDate = todayIso;
         } else {
             // Se mudou para outro mês, foca no dia 01
             targetDate = `${currentMonthIso}-01`;
         }
         
         setSelectedTimelineDate(targetDate);

         // Auto-scroll logic (Start block position forces it to top)
         setTimeout(() => {
             const el = document.getElementById(`timeline-day-${targetDate}`);
             if (el) {
                 el.scrollIntoView({ behavior: 'smooth', block: 'center' });
             } else {
                 const container = document.getElementById('timeline-sidebar');
                 if (container) container.scrollTop = 0;
             }
         }, 150);
     }
  }, [agendaPeriod, view]); // Recalcula ao mudar o mês OU ao entrar na aba (view)

  const activeDayAppointments = useMemo(() => {
    if (!selectedTimelineDate) return [];
    return monthAppointments
        .filter(a => a.date === selectedTimelineDate)
        .sort((a, b) => a.time.localeCompare(b.time));
  }, [monthAppointments, selectedTimelineDate]);


  // Lógica para "Clientes"
  const clientsList = useMemo(() => {
    const uniqueClientIds = Array.from(new Set(myAppointments.map(a => a.userId)));
    return uniqueClientIds.map(id => {
       const userProfile = usersList.find(u => u.id === id);
       const appts = myAppointments.filter(a => a.userId === id);
       const lastVisit = appts
         .filter(a => a.status === 'completed')
         .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
       
       return {
         id,
         name: userProfile?.name || appts[0]?.customerName || 'Cliente',
         username: userProfile?.username, // Add username
         avatar: userProfile?.avatarUrl,
         totalVisits: appts.filter(a => a.status === 'completed').length,
         lastVisitDate: lastVisit?.date || null,
         role: userProfile?.role || 'customer'
       };
    }).sort((a, b) => b.totalVisits - a.totalVisits); 
  }, [myAppointments, usersList]);

  // --- ACTIONS ---

  // Função de navegação inteligente que passa a aba atual para retorno
  const goToDetails = (id: string) => {
    navigate(`/appointment/${id}`, { state: { from: '/barber', returnTab: view } });
  };

  const updateStatus = async (id: string, status: Appointment['status'], reason?: string) => {
    await api.updateAppointmentStatus(id, status, reason);
    refreshData();
    if (status === 'confirmed') {
      addToast("Agendamento Confirmado!", 'success');
    }
    if (status === 'cancelled') {
        setRefusalModal({ isOpen: false, apptId: null, reason: '' });
    }
  };

  // --- LÓGICA DE CONFIGURAÇÃO DE HORÁRIOS APRIMORADA ---

  const handleAddCustomSlot = () => {
    if (!customTimeInput) return;
    if (!workingHours.includes(customTimeInput)) {
      const newHours = [...workingHours, customTimeInput].sort();
      setWorkingHours(newHours);
      setIsFullAbsence(false);
      setIsUsingDefault(false); 
    }
    setCustomTimeInput('');
  };

  const handleRemoveSlot = (slot: string) => {
    const newHours = workingHours.filter(h => h !== slot);
    setWorkingHours(newHours);
    if (newHours.length === 0) setIsFullAbsence(true);
    setIsUsingDefault(false);
  };

  const toggleAbsence = () => {
    if (isFullAbsence) {
        // Ao reabrir o dia, tenta pegar os horários salvos do DB, se não tiver, usa o SYSTEM_DEFAULT
        const recoveredHours = (currentSettings.defaultHours && currentSettings.defaultHours.length > 0)
            ? currentSettings.defaultHours
            : SYSTEM_DEFAULT_HOURS;
        
        setWorkingHours(recoveredHours);
        setIsFullAbsence(false);
        setIsUsingDefault(false); 
    } else {
        setWorkingHours([]);
        setIsFullAbsence(true);
        setIsUsingDefault(false);
    }
  };

  const handleResetToDefault = async () => {
     try {
       await api.resetBarberDateToDefault(myBarberId, configDate);
       
       // Força recarga imediata das configurações do banco
       const updated = await api.getBarberSettings(myBarberId);
       setCurrentSettings(updated);
       
       const effectiveDefault = (updated.defaultHours && updated.defaultHours.length > 0) 
          ? updated.defaultHours 
          : SYSTEM_DEFAULT_HOURS;

       setWorkingHours(effectiveDefault);
       setIsUsingDefault(true);
       setIsFullAbsence(effectiveDefault.length === 0);
       
       addToast("Padrão Restaurado!", 'success');
     } catch (e) {
       addToast("Erro ao restaurar padrão", 'error');
     }
  };

  // 1. Inicia o fluxo de salvamento
  const handleSaveRequest = (scope: 'day' | 'month' | 'default') => {
    // Se for dia específico, verificamos conflitos reais
    if (scope === 'day') {
        const conflicts = myAppointments.filter(a => {
            const isSameDate = a.date === configDate;
            const isActive = a.status === 'pending' || a.status === 'confirmed';
            const isTimeRemoved = !workingHours.includes(a.time);
            return isSameDate && isActive && isTimeRemoved;
        });

        if (conflicts.length > 0) {
            setConflictModal({ 
                isOpen: true, 
                conflicts, 
                pendingHours: workingHours, 
                scope, 
                type: 'conflict' 
            });
            return;
        }
    } 
    
    // Se for em massa (mês ou default), SEMPRE abrimos o modal de confirmação
    if (scope === 'month' || scope === 'default') {
        setConflictModal({ 
            isOpen: true, 
            conflicts: [], 
            pendingHours: workingHours, 
            scope, 
            type: 'bulk_confirm' 
        });
        return;
    }

    // Se for dia sem conflito, salva direto
    processSave(scope, workingHours);
  };

  // 2. Processa o salvamento
  const processSave = async (scope: 'day' | 'month' | 'default', hoursToSave: string[], cancelConflicts: boolean = false) => {
    try {
        if (cancelConflicts && conflictModal.conflicts.length > 0) {
            for (const appt of conflictModal.conflicts) {
                await api.updateAppointmentStatus(appt.id, 'cancelled', 'Cancelado devido à alteração na grade de horários do barbeiro.');
            }
        }

        if (scope === 'day') {
            await api.saveBarberSettingsForDate(myBarberId, configDate, hoursToSave);
            addToast(`Salvo para ${new Date(configDate + 'T12:00:00').toLocaleDateString()}`, 'success');
        } 
        else if (scope === 'default') {
            await api.saveBarberSettings(myBarberId, {
                defaultHours: hoursToSave,
                dates: currentSettings.dates || {}
            });
            addToast("Novo Padrão Geral Definido!", 'success');
        }
        else if (scope === 'month') {
            const [year, month] = configDate.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const newDates = { ...(currentSettings.dates || {}) };

            // Aplica os horários atuais para todos os dias do mês
            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                newDates[dayStr] = hoursToSave;
            }

            await api.saveBarberSettings(myBarberId, {
                defaultHours: currentSettings.defaultHours,
                dates: newDates
            });
            addToast("Aplicado para o Mês Todo!", 'success');
        }

        // Refresh State Completo
        const updated = await api.getBarberSettings(myBarberId);
        setCurrentSettings(updated);
        setIsUsingDefault(scope === 'default');
        
        setShowScheduleModal(false);
        setConflictModal({ isOpen: false, conflicts: [], pendingHours: [], scope: 'day', type: 'conflict' });
        refreshData();

    } catch (error) {
        console.error(error);
        addToast("Erro ao salvar configuração.", 'error');
    }
  };

  // --- FIM LÓGICA CONFIG ---

  const openManualBooking = (date: string, lock: boolean) => {
    if (services.length > 0) {
        setManualData({ userId: '', guestName: '', serviceId: services[0].id, date: date, time: '' });
    }
    setIsDateLocked(lock);
    setShowManualBooking(true);
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

    const createdId = await api.createAppointment(newAppt);

    if (createdId) {
      refreshData();
      setShowManualBooking(false);
      addToast("Lançamento Realizado!", 'success');
    } else {
      addToast("Erro ao criar agendamento. Verifique se o horário está livre.", 'error');
    }
  };

  if (!user || user.role !== 'barber') return null;

  const getApptCardStyles = (status: Appointment['status']) => {
    if (status === 'completed') return 'opacity-60 border-green-900/50 bg-green-900/10';
    if (status === 'cancelled') return 'opacity-50 border-red-900/50 bg-red-900/10 grayscale';
    if (status === 'confirmed') return 'border-gold-600/30 bg-zinc-900';
    return 'bg-zinc-900 border-zinc-800 hover:border-gold-500/30'; 
  };
  
  const getStatusBadge = (status: Appointment['status']) => {
      switch(status) {
          case 'confirmed': return <span className="bg-blue-600/20 text-blue-400 border border-blue-600/30 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Confirmado</span>;
          case 'pending': return <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Pendente</span>;
          case 'completed': return <span className="bg-green-600/20 text-green-400 border border-green-600/30 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Concluído</span>;
          case 'cancelled': return <span className="bg-red-600/20 text-red-400 border border-red-600/30 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Cancelado</span>;
      }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-2xl mx-auto">
      
      {/* Header Centralizado */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 rotate-12">
            <Shield size={160} className="text-gold-500" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
             <img src={user?.avatarUrl} alt={user?.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-700 shadow-lg" />
             <div>
               <h2 className="text-xl font-serif font-bold text-white tracking-wide">Comandante {user?.name.split(' ')[0]}</h2>
               <div className="flex items-center gap-2 mt-1">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                   <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Posto de Comando Ativo</p>
               </div>
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
          <button 
            onClick={() => {
              setView('agenda_geral');
              // Reset Logic: Force reset to current month and today's date
              const now = new Date();
              const tIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              setAgendaPeriod({ month: now.getMonth(), year: now.getFullYear() });
              setSelectedTimelineDate(tIso);
            }} 
            className={`flex-1 min-w-[100px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'agenda_geral' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}
          >
            Toda Agenda
          </button>
          <button onClick={() => setView('clientes')} className={`flex-1 min-w-[90px] py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'clientes' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-500'}`}>Clientes</button>
        </div>
      )}

      {/* Conteúdo */}
      <div className="min-h-[400px]">
        
        {/* VIEW: HOJE */}
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
                <div key={apt.id} onClick={() => goToDetails(apt.id)} className={`${getApptCardStyles(apt.status)} border p-5 rounded-3xl shadow-sm transition-all cursor-pointer group flex items-center gap-4`}>
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

        {/* VIEW: SOLICITAÇÕES */}
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
                    <button 
                        onClick={() => setRefusalModal({ isOpen: true, apptId: apt.id, reason: '' })} 
                        className="flex-1 py-3 bg-red-600/20 text-red-500 border border-red-600/30 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-red-600 hover:text-white"
                    >
                        Recusar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* VIEW: AGENDA GERAL */}
        {view === 'agenda_geral' && (
           <div className="space-y-6 animate-fade-in relative min-h-[500px]">
              {/* ... (no changes to timeline logic) */}
              <div className="flex items-center justify-between px-1">
                 <h3 className="font-serif font-bold text-lg">Timeline Geral</h3>
                 <div className="flex gap-2">
                    <select value={agendaPeriod.month} onChange={e => setAgendaPeriod({...agendaPeriod, month: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-gold-500 outline-none">
                       {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select value={agendaPeriod.year} onChange={e => setAgendaPeriod({...agendaPeriod, year: parseInt(e.target.value)})} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-gold-500 outline-none">
                       {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>

              <div className="absolute top-11 right-0 z-20">
                 <button onClick={() => openManualBooking(todayIso, false)} className="w-12 h-12 bg-gold-600 rounded-2xl text-white flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-110 transition-transform">
                    <Plus size={24} strokeWidth={3} />
                 </button>
              </div>

              <div className="flex gap-4 pt-6 h-[500px]">
                  {/* Timeline Sidebar (All Days) */}
                  <div id="timeline-sidebar" className="w-20 shrink-0 overflow-y-auto scrollbar-slim space-y-3 pb-4">
                      {allDaysInMonth.map(d => (
                          <button 
                            key={d.iso}
                            id={`timeline-day-${d.iso}`}
                            onClick={() => setSelectedTimelineDate(d.iso)}
                            className={`w-full flex flex-col items-center py-3 rounded-2xl transition-all relative ${
                                selectedTimelineDate === d.iso 
                                ? 'bg-gold-600 text-black shadow-lg scale-105' 
                                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                            }`}
                          >
                              <span className="text-[8px] font-black uppercase mb-1">{d.dayName}</span>
                              <span className="text-xl font-bold leading-none">{d.dayNum}</span>
                              {d.hasData && selectedTimelineDate !== d.iso && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-gold-600"></span>
                              )}
                          </button>
                      ))}
                  </div>

                  {/* Appointments List */}
                  <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-2 px-1">
                          {selectedTimelineDate && new Date(selectedTimelineDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      
                      {activeDayAppointments.length === 0 ? (
                          <div className="text-center py-20 opacity-50 bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-800 mt-2">
                             <CalendarDays size={48} className="mx-auto text-zinc-600 mb-4"/>
                             <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">Nenhuma reserva para esse dia</p>
                          </div>
                      ) : (
                          activeDayAppointments.map(apt => (
                             <div key={apt.id} onClick={() => goToDetails(apt.id)} className={`${getApptCardStyles(apt.status)} border p-5 rounded-2xl flex items-center justify-between group cursor-pointer transition-all shadow-md relative overflow-hidden`}>
                                 <div className="absolute top-2 right-2">
                                     {getStatusBadge(apt.status)}
                                 </div>
                                 
                                 <div className="flex items-center gap-4 z-10 pt-2">
                                     <span className={`font-bold text-sm font-mono tracking-tighter ${apt.status === 'cancelled' ? 'line-through text-red-500' : 'text-gold-500'}`}>{apt.time}</span>
                                     <div className="w-px h-4 bg-zinc-800"></div>
                                     <h4 className="text-white font-black uppercase text-xs tracking-wider">{apt.customerName}</h4>
                                 </div>
                                 <div className="px-2 py-1 bg-black/40 rounded border border-zinc-800 mt-2 self-end">
                                     <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                        {services.find(s => s.id === apt.serviceId)?.name.split(' ')[0]}
                                     </span>
                                 </div>
                             </div>
                          ))
                      )}
                  </div>
              </div>
           </div>
        )}

        {/* VIEW: CLIENTES */}
        {view === 'clientes' && (
            <div className="space-y-4 animate-fade-in">
                <div className="px-1">
                    <h3 className="font-serif font-bold text-lg">Carteira de Clientes</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">{clientsList.length} clientes atendidos</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {clientsList.map(client => (
                        <div key={client.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:border-gold-600/30 transition-all">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-gold-600 font-bold text-sm border border-zinc-700 overflow-hidden">
                                {client.avatar ? <img src={client.avatar} className="w-full h-full object-cover" /> : client.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-sm">
                                  {client.name} 
                                  {client.username && <span className="text-zinc-500 text-xs font-normal ml-1">(@{client.username})</span>}
                                </h4>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase">
                                    {client.lastVisitDate ? `Última visita: ${new Date(client.lastVisitDate).toLocaleDateString()}` : 'Ainda não concluiu visitas'}
                                </p>
                            </div>
                            <div className="text-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
                                <span className="block text-lg font-bold text-gold-600 leading-none">{client.totalVisits}</span>
                                <span className="text-[8px] font-black uppercase text-zinc-500">Visitas</span>
                            </div>
                            <button onClick={() => navigate(`/chat/${client.id}`)} className="p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-700">
                                <MessageSquare size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ... (rest of code: config view, modals) */}
        {view === 'config' && (
          <div className="space-y-6 animate-fade-in pb-10">
            {/* ... config UI ... */}
            <div className="flex items-center gap-4 px-1">
              <button onClick={() => setView('hoje')} className="p-2 bg-zinc-800 rounded-lg text-zinc-500 hover:text-white">
                <ChevronLeft size={20} />
              </button>
              <h3 className="font-serif font-bold text-xl text-white">Configurar Agenda</h3>
            </div>
            
             <div className="bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 space-y-8 shadow-2xl">
              {/* Seletor de Data */}
              <div>
                <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black uppercase text-zinc-500">Selecione a Data</p>
                    {!isUsingDefault && (
                        <span className="text-[9px] font-black uppercase bg-gold-600/10 text-gold-600 px-2 py-1 rounded border border-gold-600/20">
                            Data Personalizada
                        </span>
                    )}
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    value={configDate} 
                    onChange={(e) => setConfigDate(e.target.value)} 
                    className={`w-full bg-black border rounded-2xl p-5 text-sm font-bold outline-none transition-colors ${!isUsingDefault ? 'border-gold-600/50 text-gold-500' : 'border-zinc-800 text-zinc-300'}`} 
                  />
                  <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={20} />
                </div>
              </div>

              {/* Visualização de Horários */}
              <div>
                <div className="flex justify-between items-center mb-4">
                   <p className="text-[10px] font-black uppercase text-zinc-500">
                     {isFullAbsence ? "Dia Fechado (Ausência)" : `${workingHours.length} Horários Ativos`}
                   </p>
                   
                   <button 
                     onClick={toggleAbsence}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-black uppercase ${
                       isFullAbsence 
                         ? 'bg-red-600/20 text-red-500 border-red-600/50' 
                         : 'bg-zinc-800 text-zinc-400 border-transparent hover:text-white'
                     }`}
                   >
                     <Power size={12} /> {isFullAbsence ? 'Reabrir Dia' : 'Fechar Dia'}
                   </button>
                </div>

                {!isFullAbsence && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 transition-all">
                    {workingHours.map(h => (
                      <div key={h} className="py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 text-[10px] font-black text-center">
                        {h}
                      </div>
                    ))}
                    <button 
                      onClick={() => setShowScheduleModal(true)}
                      className="py-2 rounded-lg border border-dashed border-gold-600/30 bg-gold-600/5 text-gold-500 hover:bg-gold-600 hover:text-black hover:border-solid transition-all text-[10px] font-black flex items-center justify-center gap-1"
                    >
                      <Settings size={12} /> Editar
                    </button>
                  </div>
                )}
                
                {isFullAbsence && (
                   <div className="p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-600">
                      <AlertCircle size={32} className="mb-2 opacity-50" />
                      <p className="text-xs italic">Nenhum horário disponível para esta data.</p>
                      <button onClick={toggleAbsence} className="mt-4 text-gold-600 text-[10px] font-black uppercase hover:underline">Restaurar Horários</button>
                   </div>
                )}
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                 {!isUsingDefault && (
                     <button onClick={handleResetToDefault} className="w-full py-3 bg-zinc-800 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                        <RotateCcw size={14} /> Restaurar Padrão do Sistema
                     </button>
                 )}
                 
                 <button onClick={() => handleSaveRequest('day')} className="w-full py-4 bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-zinc-700">
                   <Save size={16} /> Salvar Alterações para {new Date(configDate + 'T12:00:00').toLocaleDateString()}
                 </button>
                 <button onClick={() => setShowScheduleModal(true)} className="w-full py-4 bg-gold-600 text-black font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                   <Settings size={16} /> Configurações Avançadas
                 </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ... (rest of modals: schedule, conflict, refusal) ... */}
      {/* ... keeping existing modal code ... */}
      
      {showScheduleModal && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-scale-in">
           <div className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl font-serif font-bold text-white">Personalizar Grade</h3>
                    <p className="text-[10px] font-black uppercase text-zinc-500 mt-1">
                      Editando: <span className="text-gold-600">{new Date(configDate + 'T12:00:00').toLocaleDateString()}</span>
                    </p>
                 </div>
                 <button onClick={() => setShowScheduleModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                 </button>
              </div>
              
              {/* Body */}
              <div className="p-6 sm:p-8 overflow-y-auto">
                 {/* Adicionar Horário */}
                 <div className="flex gap-3 mb-8">
                    <div className="relative flex-1">
                       <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                       <input 
                         type="time" 
                         value={customTimeInput} 
                         onChange={e => setCustomTimeInput(e.target.value)} 
                         className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm font-bold focus:border-gold-600 outline-none" 
                       />
                    </div>
                    <button 
                      onClick={handleAddCustomSlot}
                      disabled={!customTimeInput}
                      className="bg-zinc-800 hover:bg-gold-600 hover:text-black text-white px-5 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </button>
                 </div>

                 {/* Lista de Horários */}
                 <div className="mb-2 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-zinc-500">Horários Atuais ({workingHours.length})</p>
                    {workingHours.length > 0 && (
                      <button onClick={() => { setWorkingHours([]); setIsFullAbsence(true); setIsUsingDefault(false); }} className="text-[10px] font-black uppercase text-red-500 hover:underline">Limpar Tudo</button>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-8">
                    {workingHours.map(h => (
                       <div key={h} className="group relative bg-zinc-950 border border-zinc-800 hover:border-red-500/50 rounded-lg py-2 text-center transition-all">
                          <span className="text-xs font-bold text-zinc-300 group-hover:opacity-20 transition-opacity">{h}</span>
                          <button 
                            onClick={() => handleRemoveSlot(h)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                    ))}
                    {workingHours.length === 0 && (
                       <div className="col-span-4 sm:col-span-5 py-4 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-800 rounded-lg">
                          Nenhum horário definido (Dia Fechado)
                       </div>
                    )}
                 </div>
                 
                 <div className="h-px bg-zinc-800 mb-6"></div>

                 {/* Opções de Salvamento */}
                 <p className="text-[10px] font-black uppercase text-gold-600 mb-3 tracking-widest text-center">Como deseja aplicar estas alterações?</p>
                 
                 <div className="space-y-3">
                    <button 
                      onClick={() => handleSaveRequest('day')}
                      className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-transparent hover:border-gold-600/30 group transition-all"
                    >
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><Save size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase">Apenas esta data</p>
                             <p className="text-[10px] text-zinc-500">Salva especificamente para {new Date(configDate + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>

                    <button 
                      onClick={() => handleSaveRequest('month')}
                      className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-transparent hover:border-gold-600/30 group transition-all"
                    >
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><CalendarDays size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase">Para todo o Mês</p>
                             <p className="text-[10px] text-zinc-500">Aplica a grade para todos os dias deste mês</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>

                    <button 
                      onClick={() => handleSaveRequest('default')}
                      className="w-full flex items-center justify-between p-4 bg-zinc-950 hover:bg-gold-600/10 rounded-2xl border border-zinc-800 hover:border-gold-600 group transition-all"
                    >
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><Copy size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase group-hover:text-gold-500">Definir como Padrão Geral</p>
                             <p className="text-[10px] text-zinc-500">Será usado automaticamente em novos dias</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>
                    
                    {!isUsingDefault && (
                        <button 
                          onClick={handleResetToDefault}
                          className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:text-red-400 text-[10px] font-black uppercase tracking-widest"
                        >
                           <RotateCcw size={12} /> Descartar Personalização (Restaurar Padrão)
                        </button>
                    )}
                 </div>

              </div>
           </div>
        </div>
      )}

      {/* --- MODAL UNIFICADO --- */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-scale-in">
          <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden">
             {/* ... */}
             <div className={`p-8 border-b border-zinc-800 flex items-center gap-4 ${conflictModal.type === 'conflict' ? 'bg-red-900/10' : 'bg-gold-600/10'}`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${conflictModal.type === 'conflict' ? 'bg-red-600 text-white' : 'bg-gold-600 text-black'}`}>
                 {conflictModal.type === 'conflict' ? <AlertTriangle size={24}/> : <CalendarDays size={24}/>}
               </div>
               <div>
                 <h3 className="text-xl font-serif font-bold text-white">
                   {conflictModal.type === 'conflict' ? 'Conflito Detectado' : 'Confirmação de Alteração'}
                 </h3>
                 <p className={`text-[10px] font-black uppercase mt-1 ${conflictModal.type === 'conflict' ? 'text-red-400' : 'text-gold-500'}`}>
                   {conflictModal.type === 'conflict' 
                     ? `${conflictModal.conflicts.length} agendamento(s) afetado(s)`
                     : conflictModal.scope === 'month' ? 'Edição do Mês Inteiro' : 'Novo Padrão Geral'
                   }
                 </p>
               </div>
             </div>
             
             {/* CONTEÚDO */}
             <div className="p-8 space-y-6">
                <p className="text-zinc-400 text-sm leading-relaxed">
                   {conflictModal.type === 'conflict' ? (
                      "Você está removendo horários que já possuem clientes agendados. O que deseja fazer com estes agendamentos?"
                   ) : (
                     conflictModal.scope === 'month' 
                       ? `Você está prestes a aplicar esta grade de horários para TODOS os dias do mês selecionado. Dias com horários personalizados serão sobrescritos.`
                       : `Você está definindo um novo padrão global. Todos os dias futuros que não possuem personalização específica usarão esta nova grade.`
                   )}
                </p>

                {conflictModal.type === 'conflict' && (
                  <div className="bg-black/40 rounded-xl p-4 border border-zinc-800 max-h-40 overflow-y-auto">
                     {conflictModal.conflicts.map(c => (
                       <div key={c.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0 text-xs">
                          <span className="text-white font-bold">{c.customerName}</span>
                          <span className="text-gold-600 font-mono">{c.time}</span>
                       </div>
                     ))}
                  </div>
                )}

                <div className="space-y-3">
                   {conflictModal.type === 'conflict' ? (
                      <>
                        <button 
                          onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, true)}
                          className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14}/> Salvar e Cancelar Agendamentos
                        </button>
                        <button 
                          onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, false)}
                          className="w-full py-4 bg-zinc-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border border-zinc-700 hover:border-gold-600 hover:text-gold-500 transition-colors"
                        >
                          Salvar e Manter (Como Exceção)
                        </button>
                      </>
                   ) : (
                      <button 
                        onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, false)}
                        className="w-full py-4 bg-gold-600 text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-gold-500 transition-colors"
                      >
                        <Check size={16}/> Confirmar e Aplicar
                      </button>
                   )}
                   
                   <button 
                     onClick={() => setConflictModal(prev => ({ ...prev, isOpen: false }))}
                     className="w-full py-2 text-zinc-500 text-[10px] font-black uppercase hover:text-white"
                   >
                     Cancelar
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE RECUSA E MANUAL BOOKING (Igual ao anterior, apenas incluídos para integridade) --- */}
      {refusalModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-scale-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-8 border border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertCircle size={24} />
               <h3 className="text-xl font-serif font-bold text-white">Confirmar Recusa</h3>
            </div>
            <p className="text-zinc-500 text-xs mb-4 font-medium">Informe o motivo da recusa para notificar o cliente:</p>
            <textarea 
                value={refusalModal.reason} 
                onChange={(e) => setRefusalModal(prev => ({ ...prev, reason: e.target.value }))} 
                placeholder="Ex: Indisponibilidade emergencial, horário bloqueado..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-600 outline-none h-32 mb-6 text-white" 
            />
            <div className="flex gap-4">
              <button onClick={() => setRefusalModal({ isOpen: false, apptId: null, reason: '' })} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-400 hover:text-white">Voltar</button>
              <button 
                disabled={!refusalModal.reason.trim()} 
                onClick={() => refusalModal.apptId && updateStatus(refusalModal.apptId, 'cancelled', refusalModal.reason)} 
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-lg hover:bg-red-500 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
                 {/* ... Form content ... */}
                 <div className="flex items-center gap-4 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
                    <button type="button" onClick={() => setIsGuest(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!isGuest ? 'bg-zinc-800 text-gold-600' : 'text-zinc-500'}`}>Membro</button>
                    <button type="button" onClick={() => setIsGuest(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isGuest ? 'bg-zinc-800 text-gold-600' : 'text-zinc-500'}`}>Externo</button>
                 </div>
                 {isGuest ? (
                   <input required type="text" placeholder="Nome do Cliente" value={manualData.guestName} onChange={e => setManualData({...manualData, guestName: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-gold-600" />
                 ) : (
                   <select required value={manualData.userId} onChange={e => setManualData({...manualData, userId: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-gold-600">
                     <option value="">Selecione o Cliente</option>
                     {usersList.filter(u => u.role === 'customer').map(c => (
                       <option key={c.id} value={c.id}>
                         {c.name} {c.username ? `(@${c.username})` : ''}
                       </option>
                     ))}
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
