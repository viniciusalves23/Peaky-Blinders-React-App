
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trash2, Search, MessageSquare, ShieldCheck, UserCheck, Calendar, ChevronRight, Check, X, AlertCircle, Settings, Clock, RotateCcw, Edit, UserPlus, Save, Briefcase } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, useLocation } = ReactRouterDOM;
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { User, Appointment, Barber, Service } from '../types';

export const AdminManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Logged user
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [tab, setTab] = useState<'users' | 'agendamentos' | 'mestres'>('agendamentos');
  const [apptStatusTab, setApptStatusTab] = useState<'abertos' | 'concluidos' | 'cancelados'>('abertos');
  const [search, setSearch] = useState('');
  
  // Gestão de Mestre selecionado
  const [selectedMestreId, setSelectedMestreId] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<string[]>([]);

  // Estados de Ação
  const [refusalModal, setRefusalModal] = useState<{ isOpen: boolean, apptId: string | null, reason: string }>({ 
    isOpen: false, apptId: null, reason: '' 
  });
  const [finishConfirmationId, setFinishConfirmationId] = useState<string | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<{ isOpen: boolean, userId: string | null }>({
    isOpen: false, userId: null
  });

  // User CRUD Modal State
  const [userModal, setUserModal] = useState<{ isOpen: boolean, mode: 'create' | 'edit', userData: Partial<User> }>({
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

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const filteredAppointments = appointments.filter(apt => {
    if (apptStatusTab === 'abertos') return apt.status === 'pending' || apt.status === 'confirmed';
    if (apptStatusTab === 'concluidos') return apt.status === 'completed';
    return apt.status === 'cancelled';
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleMestreSelect = async (id: string) => {
    setSelectedMestreId(id);
    const settings = await api.getBarberSettings(id);
    setWorkingHours(settings.defaultHours || []);
  };

  const toggleHour = (h: string) => {
    setWorkingHours(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const saveMestreSettings = async () => {
    if (selectedMestreId) {
      const current = await api.getBarberSettings(selectedMestreId);
      await api.saveBarberSettings(selectedMestreId, { ...current, defaultHours: workingHours });
      addToast("Agenda do mestre atualizada!", 'success');
    }
  };

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
      // Regra de segurança: barber-admin não pode editar admin
      if (u.role === 'admin' && user?.role !== 'admin') {
          addToast("Acesso restrito: Apenas Suporte pode editar este perfil.", 'error');
          return;
      }
      setUserModal({ isOpen: true, mode: 'edit', userData: u });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const { userData, mode } = userModal;
      
      if (!userData.name || !userData.email) {
          addToast("Preencha os campos obrigatórios.", 'error');
          return;
      }

      try {
          if (mode === 'create') {
              // Verifica se username já existe (se fornecido)
              if (userData.username) {
                  const exists = await api.checkUsernameExists(userData.username);
                  if (exists) {
                      addToast("Este nome de usuário já está em uso.", 'error');
                      return;
                  }
              }
              await api.createUserProfileStub(userData);
              addToast("Usuário criado! (Nota: Em produção, isso enviaria um convite)", 'success');
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
        </div>
      </div>

      {tab === 'agendamentos' && (
        <div className="space-y-6">
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
            <button onClick={() => setApptStatusTab('abertos')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'abertos' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Abertos</button>
            <button onClick={() => setApptStatusTab('concluidos')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'concluidos' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Concluídos</button>
            <button onClick={() => setApptStatusTab('cancelados')} className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${apptStatusTab === 'cancelados' ? 'bg-white dark:bg-zinc-800 shadow text-gold-600' : 'text-zinc-400'}`}>Cancelados</button>
          </div>

          <div className="grid gap-4">
            {filteredAppointments.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Calendar className="mx-auto text-zinc-300 mb-4" size={40} />
                <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Sem registros no momento</p>
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
                      <h4 className="font-serif font-bold text-lg text-zinc-900 dark:text-white group-hover:text-gold-600 transition-colors">
                        {services.find(s => s.id === a.serviceId)?.name}
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Barbeiro: {barbers.find(b => b.id === a.barberId)?.name}</p>
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
                        <button onClick={() => updateStatus(a.id, 'confirmed')} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-black uppercase rounded-xl flex items-center gap-1">
                          <RotateCcw size={14}/> Reativar
                        </button>
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

      {tab === 'mestres' && (
        <div className="space-y-8">
           <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {barbers.map(barber => (
                <button 
                  key={barber.id}
                  onClick={() => handleMestreSelect(barber.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all min-w-[200px] ${
                    selectedMestreId === barber.id 
                      ? 'bg-gold-600 border-gold-600 text-white shadow-xl' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  <img src={barber.avatarUrl} className="w-10 h-10 rounded-full object-cover" />
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase">{barber.name}</p>
                    <p className={`text-[8px] font-black uppercase ${selectedMestreId === barber.id ? 'text-white/70' : 'text-gold-600'}`}>Ver Agenda</p>
                  </div>
                </button>
              ))}
           </div>

           {selectedMestreId ? (
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 animate-slide-up">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xl font-serif font-bold">Agenda de {barbers.find(b => b.id === selectedMestreId)?.name}</h3>
                   <div className="flex items-center gap-2 text-gold-600 text-[10px] font-black uppercase"><Settings size={14}/> Gestão Admin</div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-8">
                  {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(h => (
                    <button
                      key={h}
                      onClick={() => toggleHour(h)}
                      className={`py-4 rounded-xl border text-[10px] font-black transition-all ${
                        workingHours.includes(h) 
                          ? 'bg-zinc-900 dark:bg-gold-600 text-white dark:text-black border-zinc-900 dark:border-gold-600' 
                          : 'bg-zinc-50 dark:bg-black border-zinc-100 dark:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={saveMestreSettings}
                  className="w-full py-5 bg-gold-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-gold-500 transition-all active:scale-95"
                >
                  Atualizar Horários do Mestre
                </button>
             </div>
           ) : (
             <div className="py-20 text-center bg-zinc-50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <Clock size={40} className="mx-auto text-zinc-300 mb-4" />
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest">Selecione um barbeiro para gerenciar</p>
             </div>
           )}
        </div>
      )}

      {/* Modal de Recusa */}
      {refusalModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
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
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Usuário */}
      {deleteUserModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-sm rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">Confirmar Exclusão</h3>
            <p className="text-zinc-500 text-sm mb-6">Esta ação é irreversível. O usuário e todos os dados associados serão removidos permanentemente.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteUserModal({ isOpen: false, userId: null })} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">Cancelar</button>
              <button onClick={confirmDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar/Editar Usuário */}
      {userModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-scale-in">
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
                    <input 
                      type="text" 
                      required
                      value={userModal.userData.name || ''}
                      onChange={e => setUserModal({...userModal, userData: {...userModal.userData, name: e.target.value}})}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500">Usuário Único</label>
                        <input 
                        type="text" 
                        required
                        value={userModal.userData.username || ''}
                        onChange={e => setUserModal({...userModal, userData: {...userModal.userData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '')}})}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600"
                        placeholder="@usuario"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-500">E-mail</label>
                        <input 
                        type="email" 
                        required
                        disabled={userModal.mode === 'edit'} // Email geralmente é imutável sem revalidação
                        value={userModal.userData.email || ''}
                        onChange={e => setUserModal({...userModal, userData: {...userModal.userData, email: e.target.value}})}
                        className={`w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600 ${userModal.mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-500">Papel no Clube</label>
                    <select 
                      value={userModal.userData.role || 'customer'}
                      onChange={e => setUserModal({...userModal, userData: {...userModal.userData, role: e.target.value as any}})}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600"
                    >
                        <option value="customer">Cliente (Membro)</option>
                        <option value="barber">Barbeiro (Mestre)</option>
                        <option value="barber-admin">Dono (Admin da Barbearia)</option>
                        {/* Apenas admin real pode criar outro admin real */}
                        {user?.role === 'admin' && <option value="admin">Suporte Técnico (Super Admin)</option>}
                    </select>
                 </div>

                 {(userModal.userData.role === 'barber' || userModal.userData.role === 'barber-admin') && (
                     <div className="space-y-1 animate-fade-in">
                        <label className="text-[10px] font-black uppercase text-zinc-500">Especialidade (Opcional)</label>
                        <input 
                        type="text" 
                        value={userModal.userData.specialty || ''}
                        onChange={e => setUserModal({...userModal, userData: {...userModal.userData, specialty: e.target.value}})}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-gold-600"
                        placeholder="Ex: Cortes Clássicos, Barba"
                        />
                     </div>
                 )}

                 <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setUserModal({ ...userModal, isOpen: false })} className="flex-1 py-4 text-zinc-500 font-bold uppercase text-xs hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" className="flex-[2] py-4 bg-gold-600 text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-lg hover:bg-gold-500 transition-all flex items-center justify-center gap-2">
                        <Save size={16} /> Salvar Dados
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <div className="flex gap-4">
             <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar usuários..." className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-5 pl-12 pr-4 shadow-sm focus:border-gold-500 outline-none" />
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
                                        
                                        {/* Apenas mostra controles se o usuário atual tiver permissão sobre o alvo */}
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
    </div>
  );
};
