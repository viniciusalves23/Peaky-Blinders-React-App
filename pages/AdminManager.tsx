
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trash2, Search, MessageSquare, ShieldCheck, UserCheck, Calendar, ChevronRight, Check, X, AlertCircle, Settings, Clock, RotateCcw, Edit, UserPlus, Save, Briefcase, Filter, Users, CalendarDays, Power, Copy, AlertTriangle, Plus, Lock, Key, Mail, Eye, EyeOff } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, useLocation } = ReactRouterDOM;
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { User, Appointment, Barber, Service } from '../types';

// Sincronizado com API.ts
const SYSTEM_DEFAULT_HOURS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

export const AdminManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Logged user
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [tab, setTab] = useState<'users' | 'agendamentos' | 'mestres' | 'sistema'>('agendamentos');
  const [apptStatusTab, setApptStatusTab] = useState<'abertos' | 'concluidos' | 'cancelados'>('abertos');
  const [search, setSearch] = useState('');
  
  // FILTROS DA ABA RESERVAS
  const [filterBarberId, setFilterBarberId] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default Hoje

  // --- GESTÃO DE MESTRE (ABA AGENDAS - Lógica Avançada) ---
  const [selectedMestreId, setSelectedMestreId] = useState<string | null>(null);
  
  // Estados de Configuração de Agenda (Replicado do BarberDashboard)
  const [configDate, setConfigDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSettings, setCurrentSettings] = useState<{ defaultHours: string[], dates: Record<string, string[]> }>({ defaultHours: [], dates: {} });
  const [workingHours, setWorkingHours] = useState<string[]>([]); // Horas exibidas na tela (editáveis)
  const [isFullAbsence, setIsFullAbsence] = useState(false);
  const [isUsingDefault, setIsUsingDefault] = useState(true);
  
  // Estados de Configuração de E-mail (SISTEMA)
  const [smtpConfig, setSmtpConfig] = useState({ email: '', password: '', senderName: '' });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  
  // Modais de Agenda
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [conflictModal, setConflictModal] = useState<{ 
    isOpen: boolean; 
    conflicts: Appointment[]; 
    pendingHours: string[]; 
    scope: 'day' | 'month' | 'default';
    type: 'conflict' | 'bulk_confirm';
  }>({
    isOpen: false, conflicts: [], pendingHours: [], scope: 'day', type: 'conflict'
  });

  // Estados de Ação Gerais
  const [refusalModal, setRefusalModal] = useState<{ isOpen: boolean, apptId: string | null, reason: string }>({ 
    isOpen: false, apptId: null, reason: '' 
  });
  const [finishConfirmationId, setFinishConfirmationId] = useState<string | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<{ isOpen: boolean, userId: string | null }>({
    isOpen: false, userId: null
  });

  // User CRUD Modal State (Extended for password)
  const [userModal, setUserModal] = useState<{ 
      isOpen: boolean, 
      mode: 'create' | 'edit', 
      userData: Partial<User>,
      password?: string, // Campo temporário para senha
      newPassword?: string // Campo para reset de senha na edição
  }>({
    isOpen: false, mode: 'create', userData: {}
  });

  useEffect(() => {
    // Redireciona se não for admin ou dono (barber-admin)
    if (user && user.role !== 'admin' && user.role !== 'barber-admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = () => {
    api.getAllUsers().then(setUsers);
    api.getAppointments().then(setAppointments);
    api.getBarbers().then(setBarbers);
    api.getServices().then(setServices);
  };

  // Carregar configurações SMTP ao entrar na aba sistema
  useEffect(() => {
      if (tab === 'sistema') {
          api.getAppConfig().then(config => {
              setSmtpConfig({
                  email: config.smtp_email || '',
                  password: config.smtp_password || '',
                  senderName: config.sender_name || 'Peaky Blinders'
              });
          });
      }
  }, [tab]);

  // --- Lógica de Carregamento de Agenda do Mestre Selecionado ---
  useEffect(() => {
    if (!selectedMestreId) return;
    
    const fetchSettings = async () => {
      const settings = await api.getBarberSettings(selectedMestreId);
      setCurrentSettings(settings);
      
      let dateHours: string[] = [];
      let usingDefault = true;

      if (settings.dates && Array.isArray(settings.dates[configDate])) {
        dateHours = settings.dates[configDate];
        usingDefault = false;
      } else {
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
  }, [configDate, selectedMestreId, tab]); 

  // --- Funções de Manipulação de Agenda ---
  // (Mantidas do original, omitidas aqui para brevidade se não houve alteração lógica, mas mantendo no output XML)
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
     if (!selectedMestreId) return;
     try {
       await api.resetBarberDateToDefault(selectedMestreId, configDate);
       const updated = await api.getBarberSettings(selectedMestreId);
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

  const handleSaveRequest = (scope: 'day' | 'month' | 'default') => {
    if (!selectedMestreId) return;

    if (scope === 'day') {
        const conflicts = appointments.filter(a => {
            const isTargetBarber = a.barberId === selectedMestreId;
            const isSameDate = a.date === configDate;
            const isActive = a.status === 'pending' || a.status === 'confirmed';
            const isTimeRemoved = !workingHours.includes(a.time);
            return isTargetBarber && isSameDate && isActive && isTimeRemoved;
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

    processSave(scope, workingHours);
  };

  const processSave = async (scope: 'day' | 'month' | 'default', hoursToSave: string[], cancelConflicts: boolean = false) => {
    if (!selectedMestreId) return;
    try {
        if (cancelConflicts && conflictModal.conflicts.length > 0) {
            for (const appt of conflictModal.conflicts) {
                await api.updateAppointmentStatus(appt.id, 'cancelled', 'Cancelado pelo administrador devido à alteração na grade.');
            }
        }

        if (scope === 'day') {
            await api.saveBarberSettingsForDate(selectedMestreId, configDate, hoursToSave);
            addToast(`Salvo para ${new Date(configDate + 'T12:00:00').toLocaleDateString()}`, 'success');
        } 
        else if (scope === 'default') {
            await api.saveBarberSettings(selectedMestreId, {
                defaultHours: hoursToSave,
                dates: currentSettings.dates || {}
            });
            addToast("Novo Padrão Geral Definido!", 'success');
        }
        else if (scope === 'month') {
            const [year, month] = configDate.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const newDates = { ...(currentSettings.dates || {}) };

            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                newDates[dayStr] = hoursToSave;
            }

            await api.saveBarberSettings(selectedMestreId, {
                defaultHours: currentSettings.defaultHours,
                dates: newDates
            });
            addToast("Aplicado para o Mês Todo!", 'success');
        }

        const updated = await api.getBarberSettings(selectedMestreId);
        setCurrentSettings(updated);
        setIsUsingDefault(scope === 'default');
        
        setShowScheduleModal(false);
        setConflictModal({ isOpen: false, conflicts: [], pendingHours: [], scope: 'day', type: 'conflict' });
        // Recarrega agendamentos para refletir cancelamentos se houver
        api.getAppointments().then(setAppointments);

    } catch (error) {
        console.error(error);
        addToast("Erro ao salvar configuração.", 'error');
    }
  };

  const saveSmtpConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingSmtp(true);
      try {
          await api.updateAppConfig('smtp_email', smtpConfig.email);
          await api.updateAppConfig('smtp_password', smtpConfig.password);
          await api.updateAppConfig('sender_name', smtpConfig.senderName);
          addToast("Configurações de E-mail atualizadas!", 'success');
      } catch (error) {
          addToast("Erro ao salvar configurações.", 'error');
      } finally {
          setSavingSmtp(false);
      }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const filteredAppointments = appointments.filter(apt => {
    if (apptStatusTab === 'abertos' && !(apt.status === 'pending' || apt.status === 'confirmed')) return false;
    if (apptStatusTab === 'concluidos' && apt.status !== 'completed') return false;
    if (apptStatusTab === 'cancelados' && apt.status !== 'cancelled') return false;
    if (filterBarberId !== 'all' && apt.barberId !== filterBarberId) return false;
    if (filterDate && apt.date !== filterDate) return false;
    return true;
  }).sort((a, b) => a.time.localeCompare(b.time));

  const updateStatus = async (id: string, status: Appointment['status'], reason?: string) => {
    await api.updateAppointmentStatus(id, status, reason);
    api.getAppointments().then(setAppointments);
    setFinishConfirmationId(null);
    if (status === 'cancelled') setRefusalModal({ isOpen: false, apptId: null, reason: '' });
    
    if (status === 'confirmed') addToast("Reserva confirmada.", 'success');
    if (status === 'completed') addToast("Serviço concluído.", 'success');
    if (status === 'cancelled') addToast("Reserva cancelada.", 'info');
  };

  const confirmDeleteUser = async () => {
    if (deleteUserModal.userId) {
      const targetUser = users.find(u => u.id === deleteUserModal.userId);
      if (targetUser?.role === 'admin' && user?.role !== 'admin') {
          addToast("Permissão negada: Você não pode remover um Super Admin.", 'error');
          setDeleteUserModal({ isOpen: false, userId: null });
          return;
      }

      await api.deleteUser(deleteUserModal.userId);
      api.getAllUsers().then(setUsers);
      setDeleteUserModal({ isOpen: false, userId: null });
      addToast("Usuário removido com sucesso.", 'success');
    }
  };

  const openEditUser = (u: User) => {
      if (u.role === 'admin' && user?.role !== 'admin') {
          addToast("Acesso restrito: Apenas Suporte pode editar este perfil.", 'error');
          return;
      }
      setUserModal({ isOpen: true, mode: 'edit', userData: u });
  };

  const handleAdminResetPassword = async () => {
      if (!userModal.newPassword || userModal.newPassword.length < 6) {
          addToast("A nova senha deve ter no mínimo 6 caracteres.", 'error');
          return;
      }
      if (!userModal.userData.id) return;

      try {
          await api.adminResetUserPassword(userModal.userData.id, userModal.newPassword);
          addToast("Senha redefinida com sucesso!", 'success');
          setUserModal(prev => ({ ...prev, newPassword: '' }));
      } catch (error) {
          addToast("Erro ao redefinir senha.", 'error');
      }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const { userData, mode, password } = userModal;
      
      if (!userData.name) {
          addToast("O nome é obrigatório.", 'error');
          return;
      }
      if (!userData.email && !userData.username) {
          addToast("Informe pelo menos um E-mail ou Nome de Usuário.", 'error');
          return;
      }

      let finalEmail = userData.email;
      if (!finalEmail && userData.username) {
          finalEmail = `${userData.username}@peaky.interno`;
      }

      try {
          if (mode === 'create') {
              if (userData.username) {
                  const exists = await api.checkUsernameExists(userData.username);
                  if (exists) {
                      addToast("Este nome de usuário já está em uso.", 'error');
                      return;
                  }
              }
              await api.createUserProfileStub({
                  ...userData,
                  email: finalEmail
              }, password);
              
              addToast(`Usuário criado! ${!userData.email ? '(Email gerado: ' + finalEmail + ')' : ''}`, 'success');
          } else if (mode === 'edit' && userData.id) {
              await api.updateUserProfile(userData.id, userData);
              addToast("Perfil atualizado com sucesso.", 'success');
          }
          
          setUserModal({ isOpen: false, mode: 'create', userData: {} });
          loadData();
      } catch (error) {
          console.error(error);
          addToast("Erro ao salvar usuário.", 'error');
      }
  };

  const goToDetails = (id: string) => {
      navigate(`/appointment/${id}`, { state: { from: location.pathname } });
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-in max-w-4xl mx-auto">
      {/* ... Headers ... */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-white leading-tight">Central de Comando</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-600 mt-1 flex items-center gap-2">
             Gestão de Operações Shelby 
             {user?.role === 'barber-admin' && <span className="bg-gold-600 text-black px-1.5 rounded text-[8px]">DONO</span>}
          </p>
        </div>
        
        <div className="flex bg-zinc-200/50 dark:bg-zinc-900 p-1.5 rounded-2xl shadow-inner border border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar scrollbar-hide">
          <button onClick={() => setTab('agendamentos')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'agendamentos' ? 'bg-white dark:bg-zinc-800 shadow-lg text-gold-600' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Reservas</button>
          <button onClick={() => setTab('mestres')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'mestres' ? 'bg-white dark:bg-zinc-800 shadow-lg text-gold-600' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Agendas</button>
          <button onClick={() => setTab('users')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'users' ? 'bg-white dark:bg-zinc-800 shadow-lg text-gold-600' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Usuários</button>
          <button onClick={() => setTab('sistema')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${tab === 'sistema' ? 'bg-white dark:bg-zinc-800 shadow-lg text-gold-600' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>Sistema</button>
        </div>
      </div>

      {tab === 'agendamentos' && (
        <div className="space-y-6">
          {/* ... FILTROS DE RESERVA ... */}
          <div className="space-y-4">
             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setFilterBarberId('all')} className={`flex flex-col items-center gap-2 min-w-[70px] transition-opacity ${filterBarberId === 'all' ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${filterBarberId === 'all' ? 'bg-gold-600 border-gold-600 text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}><Users size={24} /></div>
                   <span className={`text-[10px] font-black uppercase tracking-wider ${filterBarberId === 'all' ? 'text-gold-600' : 'text-zinc-500'}`}>Todos</span>
                </button>
                {barbers.map(barber => (
                  <button key={barber.id} onClick={() => setFilterBarberId(barber.id)} className={`flex flex-col items-center gap-2 min-w-[70px] transition-opacity ${filterBarberId === barber.id ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                     <img src={barber.avatarUrl} className={`w-14 h-14 rounded-full object-cover border-2 ${filterBarberId === barber.id ? 'border-gold-600' : 'border-transparent filter grayscale'}`} />
                     <span className={`text-[10px] font-black uppercase tracking-wider truncate w-full text-center ${filterBarberId === barber.id ? 'text-gold-600' : 'text-zinc-500'}`}>{barber.name.split(' ')[0]}</span>
                  </button>
                ))}
             </div>
             <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <div className="relative w-full sm:w-auto">
                   <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 pl-10 text-xs font-bold uppercase text-zinc-700 dark:text-zinc-300 w-full outline-none focus:border-gold-600" />
                   <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
                <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>
                <div className="flex flex-1 w-full bg-zinc-100 dark:bg-black p-1 rounded-xl overflow-x-auto no-scrollbar">
                    <button onClick={() => setApptStatusTab('abertos')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'abertos' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Abertos</button>
                    <button onClick={() => setApptStatusTab('concluidos')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'concluidos' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Concluídos</button>
                    <button onClick={() => setApptStatusTab('cancelados')} className={`flex-1 min-w-[80px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'cancelados' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Cancelados</button>
                </div>
             </div>
          </div>

          <div className="grid gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Calendar className="mx-auto text-zinc-300 mb-4" size={40} />
                <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Sem registros para estes filtros</p>
              </div>
            ) : (
              filteredAppointments.map(a => (
                <div key={a.id} onClick={() => goToDetails(a.id)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:border-gold-500/30 transition-all cursor-pointer group">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase text-gold-600">{a.customerName}</p>
                        <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase">{a.time} • {new Date(a.date).toLocaleDateString()}</p>
                      </div>
                      <h4 className="font-serif font-bold text-lg text-zinc-900 dark:text-white group-hover:text-gold-600 transition-colors">{services.find(s => s.id === a.serviceId)?.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <img src={barbers.find(b => b.id === a.barberId)?.avatarUrl} className="w-4 h-4 rounded-full grayscale" />
                         <p className="text-[10px] text-zinc-500 font-bold uppercase">{barbers.find(b => b.id === a.barberId)?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto" onClick={e => e.stopPropagation()}>
                      {a.status === 'pending' && (
                        <>
                          <button onClick={() => updateStatus(a.id, 'confirmed')} className="flex-1 sm:flex-none p-3 bg-green-600 text-white rounded-xl hover:scale-105 transition-transform"><Check size={18}/></button>
                          <button onClick={() => setRefusalModal({ isOpen: true, apptId: a.id, reason: '' })} className="flex-1 sm:flex-none p-3 bg-red-600 text-white rounded-xl hover:scale-105 transition-transform"><X size={18}/></button>
                        </>
                      )}
                      {a.status === 'confirmed' && finishConfirmationId !== a.id && (
                        <button onClick={() => setFinishConfirmationId(a.id)} className="flex-1 sm:flex-none px-4 py-2 bg-gold-600 text-white text-[9px] font-black uppercase rounded-xl">Finalizar</button>
                      )}
                      {finishConfirmationId === a.id && (
                         <div className="flex gap-2">
                           <button onClick={() => setFinishConfirmationId(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500"><X size={16}/></button>
                           <button onClick={() => updateStatus(a.id, 'completed')} className="px-3 bg-gold-600 text-white text-[9px] font-black uppercase rounded-xl">Confirmar</button>
                         </div>
                      )}
                      {(a.status === 'completed' || a.status === 'cancelled') && (
                        <button onClick={() => updateStatus(a.id, 'confirmed')} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase rounded-xl flex items-center gap-1"><RotateCcw size={14}/> Reativar</button>
                      )}
                      <button onClick={() => navigate(`/chat/${a.userId}`)} className="flex-1 sm:flex-none p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 hover:text-gold-600 transition-colors"><MessageSquare size={18}/></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- ABA MESTRES --- */}
      {tab === 'mestres' && (
        <div className="space-y-8 animate-fade-in">
           {/* Seletor de Barbeiro */}
           <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {barbers.map(barber => (
                <button 
                  key={barber.id}
                  onClick={() => setSelectedMestreId(barber.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all min-w-[200px] ${
                    selectedMestreId === barber.id 
                      ? 'bg-gold-600 border-gold-600 text-white shadow-xl' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  <img src={barber.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase">{barber.name}</p>
                    <p className={`text-[8px] font-black uppercase ${selectedMestreId === barber.id ? 'text-white/70' : 'text-gold-600'}`}>
                        {selectedMestreId === barber.id ? 'Selecionado' : 'Gerenciar Agenda'}
                    </p>
                  </div>
                </button>
              ))}
           </div>

           {selectedMestreId ? (
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 animate-slide-up shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
                   <div>
                       <div className="flex items-center gap-2 mb-2">
                           <Settings size={16} className="text-gold-600" />
                           <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Painel de Controle de Grade</p>
                       </div>
                       <h3 className="text-2xl font-serif font-bold dark:text-white">Agenda de {barbers.find(b => b.id === selectedMestreId)?.name}</h3>
                   </div>
                   
                   {/* Seletor de Data */}
                   <div className="relative">
                      <input 
                        type="date" 
                        value={configDate} 
                        onChange={(e) => setConfigDate(e.target.value)} 
                        className={`bg-zinc-100 dark:bg-black border rounded-xl p-3 pl-10 text-xs font-bold outline-none transition-colors ${!isUsingDefault ? 'border-gold-600 text-gold-600' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'}`} 
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />
                   </div>
                </div>

                <div className="bg-zinc-50 dark:bg-black/30 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800/50 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isFullAbsence ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <p className="text-xs font-bold uppercase text-zinc-500">
                                {isFullAbsence ? "Dia Bloqueado" : `${workingHours.length} Slots Ativos`}
                            </p>
                            {!isUsingDefault && <span className="text-[8px] bg-gold-600/10 text-gold-600 px-1.5 py-0.5 rounded font-black uppercase border border-gold-600/20">Modificado</span>}
                        </div>
                        <button 
                            onClick={toggleAbsence}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border transition-all text-[9px] font-black uppercase ${
                            isFullAbsence 
                                ? 'bg-red-600/10 text-red-500 border-red-600/30' 
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white'
                            }`}
                        >
                            <Power size={12} /> {isFullAbsence ? 'Desbloquear Dia' : 'Bloquear Dia'}
                        </button>
                    </div>

                    {!isFullAbsence && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {workingHours.map(h => (
                                <div key={h} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-red-500/50 rounded-lg py-2 text-center transition-all cursor-pointer">
                                    <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 group-hover:opacity-20 transition-opacity">{h}</span>
                                    <button 
                                        onClick={() => handleRemoveSlot(h)}
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => setShowScheduleModal(true)}
                                className="py-2 rounded-lg border border-dashed border-gold-600/30 bg-gold-600/5 text-gold-600 hover:bg-gold-600 hover:text-white hover:border-solid transition-all text-[10px] font-black flex items-center justify-center gap-1"
                            >
                                <Edit size={12} /> Editar
                            </button>
                        </div>
                    )}

                    {isFullAbsence && (
                        <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                            <p className="text-xs text-zinc-400 italic">Barbeiro indisponível nesta data.</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {!isUsingDefault ? (
                        <button onClick={handleResetToDefault} className="py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all">
                            <RotateCcw size={14} /> Restaurar Padrão
                        </button>
                    ) : (
                        <div className="hidden sm:block"></div>
                    )}
                    
                    <div className="flex gap-2">
                        <button onClick={() => setShowScheduleModal(true)} className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-800 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all">
                            <Settings size={14} /> Avançado
                        </button>
                        <button onClick={() => handleSaveRequest('day')} className="flex-1 py-3 bg-gold-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-gold-500">
                            <Save size={14} /> Salvar Dia
                        </button>
                    </div>
                </div>
             </div>
           ) : (
             <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Clock size={40} className="mx-auto text-zinc-300 mb-4" />
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Selecione um barbeiro para gerenciar a grade</p>
             </div>
           )}
        </div>
      )}

      {/* --- ABA USUÁRIOS --- */}
      {tab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          {/* ... User Management Code (Unchanged) ... */}
          <div className="flex gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Pesquisar usuários..." 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-5 pl-12 pr-4 shadow-sm focus:border-gold-500 outline-none" 
                />
             </div>
             <button 
               onClick={() => setUserModal({ isOpen: true, mode: 'create', userData: { role: 'customer' } })}
               className="bg-gold-600 text-black px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-gold-500 transition-all flex items-center gap-2"
             >
               <UserPlus size={18} /> Novo
             </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[9px] uppercase font-black tracking-[0.2em] text-zinc-400">
                        <tr>
                            <th className="px-6 py-5">Identificação</th>
                            <th className="px-6 py-5">Papel</th>
                            <th className="px-6 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatarUrl} alt={u.name} className="w-9 h-9 rounded-full object-cover bg-zinc-800" />
                                        <div>
                                            <p className="font-bold text-xs uppercase text-zinc-900 dark:text-white">{u.name}</p>
                                            <p className="text-[10px] text-zinc-500">{u.username ? `@${u.username}` : u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${
                                        u.role === 'admin' ? 'bg-red-600/20 text-red-500' : 
                                        u.role === 'barber-admin' ? 'bg-gold-600 text-black border border-gold-500' :
                                        u.role === 'barber' ? 'bg-blue-600 text-white' : 
                                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                    }`}>
                                        {u.role === 'admin' ? 'Suporte' : u.role === 'barber-admin' ? 'Dono' : u.role === 'barber' ? 'Barbeiro' : 'Cliente'}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => navigate(`/chat/${u.id}`)} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-gold-600 hover:scale-110 transition-transform"><MessageSquare size={16}/></button>
                                        {!(u.role === 'admin' && user?.role !== 'admin') && (
                                            <>
                                                <button onClick={() => openEditUser(u)} className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"><Edit size={16}/></button>
                                                <button onClick={() => setDeleteUserModal({ isOpen: true, userId: u.id })} className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ABA SISTEMA (SMTP) --- */}
      {tab === 'sistema' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500">
                          <Mail size={24} />
                      </div>
                      <div>
                          <h3 className="text-2xl font-serif font-bold dark:text-white">Servidor de E-mail (SMTP)</h3>
                          <p className="text-[10px] font-black uppercase text-zinc-500 mt-1 tracking-widest">Configuração do Google Workspace / Gmail</p>
                      </div>
                  </div>

                  <form onSubmit={saveSmtpConfig} className="space-y-6 max-w-xl">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-500 pl-1">Nome do Remetente</label>
                          <input 
                            type="text" 
                            value={smtpConfig.senderName} 
                            onChange={e => setSmtpConfig({...smtpConfig, senderName: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-500 outline-none transition-colors"
                            placeholder="Ex: Peaky Blinders Barbearia"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-500 pl-1">E-mail de Envio (Gmail)</label>
                          <input 
                            type="email" 
                            value={smtpConfig.email} 
                            onChange={e => setSmtpConfig({...smtpConfig, email: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-500 outline-none transition-colors"
                            placeholder="seuemail@gmail.com"
                          />
                      </div>

                      <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-zinc-500 pl-1 flex items-center gap-2">
                              Senha de Aplicativo <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1.5 rounded">APP PASSWORD</span>
                          </label>
                          <div className="relative">
                              <input 
                                type={showSmtpPassword ? "text" : "password"} 
                                value={smtpConfig.password} 
                                onChange={e => setSmtpConfig({...smtpConfig, password: e.target.value})}
                                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 pr-12 text-sm font-bold focus:border-blue-500 outline-none transition-colors"
                                placeholder="xxxx xxxx xxxx xxxx"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                              >
                                  {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-2 pl-1 leading-relaxed">
                              Use uma <strong>Senha de App</strong> do Google (Gerenciada em myaccount.google.com > Segurança > Verificação em duas etapas). Não use sua senha pessoal de login.
                          </p>
                      </div>

                      <button 
                        type="submit" 
                        disabled={savingSmtp}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                          {savingSmtp ? 'Salvando...' : 'Atualizar Credenciais'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* ... (Existing Modals: Refusal, Delete, User, Schedule, Conflict) ... */}
      {/* (Mantendo os modais existentes sem alteração, apenas garantindo que estão fechados corretamente no final do componente) */}
      
      {refusalModal.isOpen && createPortal(
        /* ... Modal Recusa Code ... */
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-sm rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertCircle size={24} />
               <h3 className="text-xl font-serif font-bold">Recusar Reserva</h3>
            </div>
            <textarea value={refusalModal.reason} onChange={(e) => setRefusalModal(prev => ({ ...prev, reason: e.target.value }))} placeholder="Informe o motivo..." className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:border-red-500 outline-none h-32 mb-6" />
            <div className="flex gap-4">
              <button onClick={() => setRefusalModal({ isOpen: false, apptId: null, reason: '' })} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-400">Voltar</button>
              <button disabled={!refusalModal.reason.trim()} onClick={() => refusalModal.apptId && updateStatus(refusalModal.apptId, 'cancelled', refusalModal.reason)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30">Confirmar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteUserModal.isOpen && createPortal(
        /* ... Modal Delete Code ... */
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-sm rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">Confirmar Exclusão</h3>
            <p className="text-zinc-500 text-sm mb-6">Esta ação é irreversível.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteUserModal({ isOpen: false, userId: null })} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">Cancelar</button>
              <button onClick={confirmDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500">Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {userModal.isOpen && createPortal(
        /* ... Modal User Code ... */
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-scale-in">
           <div className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
                 <h3 className="text-xl font-serif font-bold text-white">
                    {userModal.mode === 'create' ? 'Novo Recruta' : 'Editar Perfil'}
                 </h3>
                 <button onClick={() => setUserModal({ ...userModal, isOpen: false })} className="text-zinc-500 hover:text-white"><X size={24}/></button>
              </div>
              
              <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Nome Completo</label>
                    <input type="text" required value={userModal.userData.name || ''} onChange={e => setUserModal({...userModal, userData: {...userModal.userData, name: e.target.value}})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500">Usuário Único</label>
                        <input type="text" value={userModal.userData.username || ''} onChange={e => setUserModal({...userModal, userData: {...userModal.userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')}})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600" placeholder="@usuario" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500">E-mail {userModal.mode === 'create' && userModal.userData.username && <span className="text-[8px] opacity-60 ml-1">(OPCIONAL)</span>}</label>
                        <input 
                          type="email" 
                          required={!userModal.userData.username} // Obrigatório apenas se username estiver vazio
                          disabled={userModal.mode === 'edit'} 
                          value={userModal.userData.email || ''} 
                          onChange={e => setUserModal({...userModal, userData: {...userModal.userData, email: e.target.value}})} 
                          className={`w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600 ${userModal.mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          placeholder="email@exemplo.com"
                        />
                    </div>
                 </div>

                 {/* CAMPO DE SENHA NA CRIAÇÃO */}
                 {userModal.mode === 'create' && (
                     <div className="space-y-1 animate-fade-in">
                        <label className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-1"><Lock size={10} /> Senha Inicial</label>
                        <input 
                          type="text" 
                          value={userModal.password || ''}
                          onChange={e => setUserModal({...userModal, password: e.target.value})}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <p className="text-[9px] text-zinc-600 pl-1">Se vazio, o usuário precisará recuperar a senha.</p>
                     </div>
                 )}

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Papel no Clube</label>
                    <select value={userModal.userData.role || 'customer'} onChange={e => setUserModal({...userModal, userData: {...userModal.userData, role: e.target.value as any}})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600">
                        <option value="customer">Cliente (Membro)</option>
                        <option value="barber">Barbeiro (Mestre)</option>
                        <option value="barber-admin">Dono (Admin da Barbearia)</option>
                        {user?.role === 'admin' && <option value="admin">Suporte Técnico (Super Admin)</option>}
                    </select>
                 </div>
                 
                 {(userModal.userData.role === 'barber' || userModal.userData.role === 'barber-admin') && (
                     <div className="space-y-1 animate-fade-in">
                        <label className="text-[10px] font-black uppercase text-zinc-500">Especialidade (Opcional)</label>
                        <input type="text" value={userModal.userData.specialty || ''} onChange={e => setUserModal({...userModal, userData: {...userModal.userData, specialty: e.target.value}})} className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600" placeholder="Ex: Cortes Clássicos, Barba" />
                     </div>
                 )}

                 {/* RESET DE SENHA NA EDIÇÃO */}
                 {userModal.mode === 'edit' && (
                     <div className="pt-4 border-t border-zinc-800 mt-2">
                        <p className="text-[10px] font-black uppercase text-gold-600 mb-2 flex items-center gap-1"><ShieldCheck size={12}/> Segurança</p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={userModal.newPassword || ''}
                                onChange={e => setUserModal({...userModal, newPassword: e.target.value})}
                                placeholder="Nova senha"
                                className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-white text-xs outline-none focus:border-gold-600"
                            />
                            <button 
                                type="button"
                                onClick={handleAdminResetPassword}
                                className="px-4 py-2 bg-zinc-800 hover:bg-gold-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Key size={14} /> Redefinir
                            </button>
                        </div>
                     </div>
                 )}

                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setUserModal({ ...userModal, isOpen: false })} className="flex-1 py-4 text-zinc-500 font-bold uppercase text-xs hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" className="flex-[2] py-4 bg-gold-600 text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-lg hover:bg-gold-500 transition-all flex items-center justify-center gap-2"><Save size={16} /> Salvar Dados</button>
                 </div>
              </form>
           </div>
        </div>,
        document.body
      )}

      {showScheduleModal && createPortal(
        /* ... Modal Schedule Code ... */
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-scale-in">
           <div className="bg-zinc-900 w-full max-w-lg rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-xl font-serif font-bold text-white">Configurar Grade</h3>
                    <p className="text-[10px] font-black uppercase text-zinc-500 mt-1">
                      Mestre: <span className="text-gold-600">{barbers.find(b => b.id === selectedMestreId)?.name}</span>
                    </p>
                 </div>
                 <button onClick={() => setShowScheduleModal(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <div className="p-6 sm:p-8 overflow-y-auto">
                 <div className="flex gap-3 mb-8">
                    <div className="relative flex-1">
                       <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                       <input type="time" value={customTimeInput} onChange={e => setCustomTimeInput(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm font-bold focus:border-gold-600 outline-none" />
                    </div>
                    <button onClick={handleAddCustomSlot} disabled={!customTimeInput} className="bg-zinc-800 hover:bg-gold-600 hover:text-black text-white px-5 rounded-xl font-bold transition-all disabled:opacity-50"><Plus size={20} /></button>
                 </div>
                 <div className="mb-2 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase text-zinc-500">Horários Atuais ({workingHours.length})</p>
                    {workingHours.length > 0 && <button onClick={() => { setWorkingHours([]); setIsFullAbsence(true); setIsUsingDefault(false); }} className="text-[10px] font-black uppercase text-red-500 hover:underline">Limpar Tudo</button>}
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mb-8">
                    {workingHours.map(h => (
                       <div key={h} className="group relative bg-zinc-950 border border-zinc-800 hover:border-red-500/50 rounded-lg py-2 text-center transition-all">
                          <span className="text-xs font-bold text-zinc-300 group-hover:opacity-20 transition-opacity">{h}</span>
                          <button onClick={() => handleRemoveSlot(h)} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><Trash2 size={16} /></button>
                       </div>
                    ))}
                    {workingHours.length === 0 && <div className="col-span-4 sm:col-span-5 py-4 text-center text-zinc-600 text-xs italic border border-dashed border-zinc-800 rounded-lg">Nenhum horário definido (Dia Fechado)</div>}
                 </div>
                 <div className="h-px bg-zinc-800 mb-6"></div>
                 <p className="text-[10px] font-black uppercase text-gold-600 mb-3 tracking-widest text-center">Como deseja aplicar estas alterações?</p>
                 <div className="space-y-3">
                    <button onClick={() => handleSaveRequest('day')} className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-transparent hover:border-gold-600/30 group transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><Save size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase">Apenas esta data</p>
                             <p className="text-[10px] text-zinc-500">Salva para {new Date(configDate + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>
                    <button onClick={() => handleSaveRequest('month')} className="w-full flex items-center justify-between p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-transparent hover:border-gold-600/30 group transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><CalendarDays size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase">Para todo o Mês</p>
                             <p className="text-[10px] text-zinc-500">Aplica para todos os dias deste mês</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>
                    <button onClick={() => handleSaveRequest('default')} className="w-full flex items-center justify-between p-4 bg-zinc-950 hover:bg-gold-600/10 rounded-2xl border border-zinc-800 hover:border-gold-600 group transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-gold-500"><Copy size={18} /></div>
                          <div className="text-left">
                             <p className="text-xs font-bold text-white uppercase group-hover:text-gold-500">Definir como Padrão Geral</p>
                             <p className="text-[10px] text-zinc-500">Será usado em novos dias</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-500" />
                    </button>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}

      {conflictModal.isOpen && createPortal(
        /* ... Modal Conflict Code ... */
        <div className="fixed inset-0 z-[3010] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-scale-in">
          <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] border border-zinc-800 shadow-2xl overflow-hidden">
             <div className={`p-8 border-b border-zinc-800 flex items-center gap-4 ${conflictModal.type === 'conflict' ? 'bg-red-900/10' : 'bg-gold-600/10'}`}>
               <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${conflictModal.type === 'conflict' ? 'bg-red-600 text-white' : 'bg-gold-600 text-black'}`}>
                 {conflictModal.type === 'conflict' ? <AlertTriangle size={24}/> : <CalendarDays size={24}/>}
               </div>
               <div>
                 <h3 className="text-xl font-serif font-bold text-white">
                   {conflictModal.type === 'conflict' ? 'Conflito Detectado' : 'Confirmação de Admin'}
                 </h3>
                 <p className={`text-[10px] font-black uppercase mt-1 ${conflictModal.type === 'conflict' ? 'text-red-400' : 'text-gold-500'}`}>
                   {conflictModal.type === 'conflict' ? `${conflictModal.conflicts.length} agendamento(s) afetado(s)` : conflictModal.scope === 'month' ? 'Edição em Massa' : 'Novo Padrão'}
                 </p>
               </div>
             </div>
             <div className="p-8 space-y-6">
                <p className="text-zinc-400 text-sm leading-relaxed">
                   {conflictModal.type === 'conflict' ? "Você está removendo horários com clientes agendados. Deseja cancelar esses agendamentos e notificar os clientes?" : conflictModal.scope === 'month' ? `Aplicar esta grade para TODOS os dias do mês selecionado?` : `Definir como novo padrão para dias futuros?`}
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
                        <button onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, true)} className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"><Trash2 size={14}/> Salvar e Cancelar</button>
                        <button onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, false)} className="w-full py-4 bg-zinc-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest border border-zinc-700 hover:border-gold-600 transition-colors">Salvar e Manter (Forçar)</button>
                      </>
                   ) : (
                      <button onClick={() => processSave(conflictModal.scope, conflictModal.pendingHours, false)} className="w-full py-4 bg-gold-600 text-black rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-gold-500 transition-colors"><Check size={16}/> Confirmar e Aplicar</button>
                   )}
                   <button onClick={() => setConflictModal(prev => ({ ...prev, isOpen: false }))} className="w-full py-2 text-zinc-500 text-[10px] font-black uppercase hover:text-white">Cancelar</button>
                </div>
             </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
