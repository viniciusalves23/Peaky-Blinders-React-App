
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { LogOut, Settings, ShieldCheck, User as UserIcon, Calendar, Clock, XCircle, Plus, ChevronRight, X, Save, MessageSquare, Headphones, AlertTriangle, Camera } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate, useLocation } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Appointment, Service, Barber } from '../types';

export const Profile: React.FC = () => {
  const { user, logout, loading, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeTab, setActiveTab] = useState<'abertos' | 'concluidos' | 'cancelados'>('abertos');
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  
  // Novo estado para o modal de aviso de 2h
  const [showCancellationWarning, setShowCancellationWarning] = useState(false);
  
  // Estados de Upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
        loadAppointments();
        api.getServices().then(setServices);
        api.getBarbers().then(setBarbers);
    }
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;
    const all = await api.getAppointments();
    setAppointments(all.filter(app => app.userId === user.id));
  };

  const handleAvatarClick = () => {
    if (user?.role === 'barber' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    setUploading(true);
    
    try {
      const newUrl = await api.uploadProfilePicture(user.id, file);
      if (newUrl) {
        // Atualiza contexto
        refreshUser(); 
        addToast("Foto de perfil atualizada com sucesso!", "success");
      } else {
        addToast("Erro ao enviar foto. Verifique se o bucket 'avatars' existe no Supabase e é público.", "error");
      }
    } catch (error) {
      addToast("Erro ao processar imagem.", "error");
    } finally {
      setUploading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'abertos') return apt.status === 'pending' || apt.status === 'confirmed';
    if (activeTab === 'concluidos') return apt.status === 'completed';
    return apt.status === 'cancelled';
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCancelClick = (apt: Appointment) => {
    // Validação de 2 horas
    const apptDateTime = new Date(`${apt.date}T${apt.time}:00`);
    const now = new Date();
    const diffInMs = apptDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 2) {
      setShowCancellationWarning(true);
      return;
    }

    setAppointmentToCancel(apt.id);
    setCancelReason(''); // Reset reason
    setIsCancelModalOpen(true);
  };

  const confirmCancellation = async () => {
    if (appointmentToCancel) {
      if (!cancelReason.trim()) {
        addToast("Por favor, informe o motivo do cancelamento.", "error");
        return;
      }
      
      await api.updateAppointmentStatus(appointmentToCancel, 'cancelled', `Cancelado pelo cliente: ${cancelReason}`);
      loadAppointments();
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
      setCancelReason('');
      addToast("Agendamento cancelado.", "success");
    }
  };

  const goToDetails = (id: string) => {
      navigate(`/appointment/${id}`, { state: { from: location.pathname } });
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-10 pb-12 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900/50 p-6 sm:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-800 border-2 border-gold-600 dark:border-gold-500 flex items-center justify-center overflow-hidden shadow-xl">
               {user.avatarUrl ? (
                 <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
               ) : (
                 <span className="text-3xl font-serif text-gold-600 dark:text-gold-500 font-bold">{user.name.charAt(0).toUpperCase()}</span>
               )}
            </div>
            
            {/* Botão de Upload Apenas para Barbeiros */}
            {user.role === 'barber' && (
              <>
                <button 
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 bg-gold-600 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-zinc-900 hover:scale-110 transition-transform disabled:opacity-50"
                  title="Alterar foto"
                >
                  <Camera size={14} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </>
            )}
            
            {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-serif text-zinc-900 dark:text-white font-black">{user.name}</h2>
            {user.username && (
              <p className="text-xs text-zinc-500 font-bold mb-1">@{user.username}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                user.role === 'admin' ? 'bg-gold-600 text-white' : user.role === 'barber' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {user.role === 'admin' ? 'Suporte' : user.role === 'barber' ? 'Barbeiro' : 'Cliente'}
              </span>
            </div>
          </div>
        </div>

        {(user.role === 'admin' || user.role === 'barber') && (
           <button 
             onClick={() => navigate(user.role === 'admin' ? '/admin' : '/barber')}
             className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-gold-600 text-white rounded-2xl shadow-lg font-black uppercase text-[10px] tracking-widest"
           >
             Acessar Painel de Gestão
           </button>
        )}

        <Link to={`/chat/admin`} className="mt-3 w-full flex items-center justify-center gap-3 py-4 bg-zinc-900 dark:bg-zinc-800 text-gold-500 rounded-2xl border border-zinc-800 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98]">
          <Headphones size={20} />
          <span className="text-xs font-black uppercase tracking-widest">Falar com Suporte</span>
        </Link>
      </div>

      <LoyaltyCard 
        appointments={appointments} 
        services={services} 
        barbers={barbers} 
      />

      <section>
        <div className="flex justify-between items-center mb-6 px-1">
          <h3 className="font-serif text-xl font-bold">Minhas Reservas</h3>
          <button onClick={() => navigate('/book')} className="p-2 bg-gold-600 text-white rounded-xl shadow-lg active:scale-90 transition-transform">
            <Plus size={20}/>
          </button>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl mb-6 border border-zinc-200 dark:border-zinc-800 shadow-inner overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('abertos')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'abertos' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-400'}`}>Abertos</button>
          <button onClick={() => setActiveTab('concluidos')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'concluidos' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-400'}`}>Concluídos</button>
          <button onClick={() => setActiveTab('cancelados')} className={`flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cancelados' ? 'bg-white dark:bg-zinc-800 shadow-md text-gold-600' : 'text-zinc-400'}`}>Recusados</button>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/50 p-12 rounded-3xl text-center border border-dashed border-zinc-200 dark:border-zinc-800">
            <Calendar className="mx-auto text-zinc-300 mb-4" size={40} />
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Nenhum agendamento</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map(apt => (
              <div key={apt.id} onClick={() => goToDetails(apt.id)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm animate-slide-up hover:border-gold-500/30 transition-all cursor-pointer group">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-serif font-bold text-base text-zinc-900 dark:text-white group-hover:text-gold-600 transition-colors">{services.find(s => s.id === apt.serviceId)?.name}</h4>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                       <Clock size={10} className="inline mr-1" /> {barbers.find(b => b.id === apt.barberId)?.name} • {apt.time} • {new Date(apt.date).toLocaleDateString()}</p>
                   </div>
                   <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                     apt.status === 'confirmed' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 
                     apt.status === 'pending' ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' : 
                     apt.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                     'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                   }`}>
                     {apt.status}
                   </div>
                 </div>
                 <div className="mt-4 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => goToDetails(apt.id)} className="flex-1 py-2 text-[10px] font-black uppercase bg-zinc-50 dark:bg-zinc-800 rounded-xl">Detalhes</button>
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button onClick={() => handleCancelClick(apt)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 dark:bg-red-900/10 rounded-xl">Cancelar</button>
                    )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Aviso de Cancelamento Tardio */}
      {showCancellationWarning && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 text-center border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-serif font-bold mb-3 text-zinc-900 dark:text-white">Cancelamento Tardio</h3>
            <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
              Para cancelamentos com menos de 2h de antecedência, por favor entre em contato com a barbearia pelo chat ou telefone/WhatsApp.
            </p>
            <button 
              onClick={() => setShowCancellationWarning(false)} 
              className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform"
            >
              Entendido
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Confirmação de Cancelamento */}
      {isCancelModalOpen && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 text-center border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><XCircle size={32} /></div>
            <h3 className="text-xl font-serif font-bold mb-3 text-zinc-900 dark:text-white">Deseja cancelar?</h3>
            <p className="text-zinc-500 text-sm mb-4">Esta ação irá liberar seu horário. Por favor, informe o motivo:</p>
            
            <textarea 
               value={cancelReason}
               onChange={(e) => setCancelReason(e.target.value)}
               placeholder="Imprevisto, doença, mudança de planos..."
               className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm mb-6 focus:border-red-500 outline-none h-24 resize-none"
            />

            <div className="flex gap-4">
              <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black uppercase text-[10px] tracking-widest">Voltar</button>
              <button 
                disabled={!cancelReason.trim()}
                onClick={confirmCancellation} 
                className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="pt-6">
        <button onClick={logout} className="w-full py-5 text-red-600 font-black uppercase tracking-[0.2em] text-[10px] bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-center gap-3">
          <LogOut size={18} /> Encerrar Sessão
        </button>
      </div>
    </div>
  );
};
