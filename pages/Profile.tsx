
import React, { useEffect, useState } from 'react';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { LogOut, Settings, ShieldCheck, User as UserIcon, Calendar, Clock, XCircle, Plus, ChevronRight, X, Save, MessageSquare, Headphones, AlertTriangle } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate } = ReactRouterDOM;
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Appointment, Service, Barber } from '../types';

export const Profile: React.FC = () => {
  const { user, logout, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeTab, setActiveTab] = useState<'abertos' | 'concluidos' | 'cancelados'>('abertos');
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

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

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'abertos') return apt.status === 'pending' || apt.status === 'confirmed';
    if (activeTab === 'concluidos') return apt.status === 'completed';
    return apt.status === 'cancelled';
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const confirmCancellation = async () => {
    if (appointmentToCancel) {
      await api.updateAppointmentStatus(appointmentToCancel, 'cancelled', 'Cancelado pelo cliente');
      loadAppointments();
      setIsCancelModalOpen(false);
      setAppointmentToCancel(null);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="space-y-10 pb-12 animate-fade-in max-w-2xl mx-auto">
      <div className="bg-white dark:bg-zinc-900/50 p-6 sm:p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-800 border-2 border-gold-600 dark:border-gold-500 flex items-center justify-center text-3xl font-serif text-gold-600 dark:text-gold-500 font-bold shadow-xl">
             {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-serif text-zinc-900 dark:text-white font-black">{user.name}</h2>
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

      <LoyaltyCard stamps={user.loyaltyStamps} />

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
              <div key={apt.id} onClick={() => navigate(`/appointment/${apt.id}`)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm animate-slide-up hover:border-gold-500/30 transition-all cursor-pointer group">
                 <div className="flex justify-between items-start">
                   <div>
                     <h4 className="font-serif font-bold text-base text-zinc-900 dark:text-white group-hover:text-gold-600 transition-colors">{services.find(s => s.id === apt.serviceId)?.name}</h4>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">
                       <Clock size={10} className="inline mr-1" /> {barbers.find(b => b.id === apt.barberId)?.name} • {apt.time} • {new Date(apt.date).toLocaleDateString()}
                     </p>
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
                    <button onClick={() => navigate(`/appointment/${apt.id}`)} className="flex-1 py-2 text-[10px] font-black uppercase bg-zinc-50 dark:bg-zinc-800 rounded-xl">Detalhes</button>
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button onClick={() => { setAppointmentToCancel(apt.id); setIsCancelModalOpen(true); }} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 dark:bg-red-900/10 rounded-xl">Cancelar</button>
                    )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 text-center border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6"><XCircle size={32} /></div>
            <h3 className="text-xl font-serif font-bold mb-3 text-zinc-900 dark:text-white">Deseja cancelar?</h3>
            <p className="text-zinc-500 text-sm mb-8">Esta ação irá liberar seu horário para outros membros. Confirma o cancelamento?</p>
            <div className="flex gap-4">
              <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black uppercase text-[10px] tracking-widest">Manter</button>
              <button onClick={confirmCancellation} className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Sim, Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6">
        <button onClick={logout} className="w-full py-5 text-red-600 font-black uppercase tracking-[0.2em] text-[10px] bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center justify-center gap-3">
          <LogOut size={18} /> Encerrar Sessão
        </button>
      </div>
    </div>
  );
};
