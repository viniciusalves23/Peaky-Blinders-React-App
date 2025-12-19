
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { db } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { Appointment } from '../types';
import { ChevronLeft, Calendar, Clock, Scissors, User as UserIcon, MessageSquare, AlertCircle, CheckCircle, XCircle, Check, X, ShieldAlert } from 'lucide-react';

export const AppointmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [isRefusing, setIsRefusing] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadAppt();
  }, [id, user]);

  const loadAppt = () => {
    if (id) {
      const data = db.getAppointmentById(id);
      if (data) setAppt(data);
      else navigate('/');
    }
  };

  if (!appt) return null;

  const service = db.getServices().find(s => s.id === appt.serviceId);
  const barber = db.getBarbers().find(b => b.id === appt.barberId);
  const isProfessional = user?.role === 'admin' || user?.role === 'barber';

  const handleUpdateStatus = (status: Appointment['status'], reason?: string) => {
    if (!appt) return;
    db.updateAppointmentStatus(appt.id, status, reason);
    setIsRefusing(false);
    setIsConfirmingFinish(false);
    loadAppt();
  };

  const getStatusInfo = () => {
    switch(appt.status) {
      case 'confirmed': return { Icon: CheckCircle, label: 'Confirmado', color: 'text-blue-500 bg-blue-500/10', iconClass: 'text-blue-500' };
      case 'completed': return { Icon: CheckCircle, label: 'Concluído', color: 'text-green-500 bg-green-500/10', iconClass: 'text-green-500' };
      case 'cancelled': return { Icon: XCircle, label: 'Cancelado', color: 'text-red-500 bg-red-500/10', iconClass: 'text-red-500' };
      default: return { Icon: AlertCircle, label: 'Pendente', color: 'text-yellow-500 bg-yellow-500/10', iconClass: 'text-yellow-500' };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.Icon;

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-gold-500 transition-colors">
        <ChevronLeft size={20} /> Voltar
      </button>

      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        <div className={`p-8 flex flex-col items-center text-center gap-4 ${statusInfo.color.split(' ')[1]}`}>
          <StatusIcon className={statusInfo.iconClass} size={48} />
          <div>
            <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-white">Reserva {statusInfo.label}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">Ref: {appt.id.slice(-6)}</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1">
                <Calendar size={12}/> Data
              </span>
              <p className="font-bold text-lg dark:text-white">{new Date(appt.date + 'T12:00:00').toLocaleDateString()}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1 justify-end">
                <Clock size={12}/> Horário
              </span>
              <p className="font-bold text-lg dark:text-white">{appt.time}</p>
            </div>
          </div>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 border-dashed border-t"></div>

          <div className="space-y-4">
             <div className="flex items-center gap-4 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 bg-gold-600 rounded-full flex items-center justify-center text-white shadow-lg"><Scissors size={24}/></div>
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Serviço Escolhido</span>
                  <h4 className="font-serif font-bold text-lg dark:text-white">{service?.name}</h4>
                  <p className="text-xs text-gold-600 font-bold">R$ {service?.price}</p>
                </div>
             </div>

             <div className="flex items-center gap-4 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <img src={barber?.avatar} className="w-12 h-12 rounded-full object-cover grayscale border-2 border-zinc-800" />
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Mestre Barbeiro</span>
                  <h4 className="font-bold text-lg dark:text-white">{barber?.name}</h4>
                  <p className="text-xs text-zinc-500 font-bold uppercase">{barber?.specialty}</p>
                </div>
             </div>

             {isProfessional && (
               <div className="flex items-center gap-4 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-gold-500 uppercase font-black border border-gold-500/20">{appt.customerName.charAt(0)}</div>
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Cliente Shelby</span>
                  <h4 className="font-bold text-lg dark:text-white">{appt.customerName}</h4>
                </div>
             </div>
             )}
          </div>

          {appt.status === 'cancelled' && appt.refusalReason && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1 block flex items-center gap-2"><ShieldAlert size={14}/> Nota de Cancelamento</span>
              <p className="text-sm text-red-700 dark:text-red-400 italic font-medium leading-relaxed">"{appt.refusalReason}"</p>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
             {isProfessional && appt.status === 'pending' && !isRefusing && (
               <div className="flex gap-3">
                 <button onClick={() => handleUpdateStatus('confirmed')} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                   <Check size={18}/> Aprovar Agora
                 </button>
                 <button onClick={() => setIsRefusing(true)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                   <X size={18}/> Recusar
                 </button>
               </div>
             )}

             {isRefusing && (
               <div className="space-y-4 animate-slide-up bg-red-50 dark:bg-red-900/5 p-6 rounded-2xl border border-red-100 dark:border-red-900/20">
                  <p className="text-[10px] font-black uppercase text-red-600">Justifique a recusa</p>
                  <textarea value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} placeholder="Ex: Indisponibilidade emergencial..." className="w-full bg-white dark:bg-black border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-sm focus:outline-none text-white" />
                  <div className="flex gap-2">
                    <button onClick={() => setIsRefusing(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Voltar</button>
                    <button disabled={!refusalReason.trim()} onClick={() => handleUpdateStatus('cancelled', refusalReason)} className="flex-2 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-lg">Confirmar Recusa</button>
                  </div>
               </div>
             )}

             {isProfessional && appt.status === 'confirmed' && !isConfirmingFinish && (
               <button onClick={() => setIsConfirmingFinish(true)} className="w-full py-4 bg-gold-600 text-black font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                   <CheckCircle size={18}/> Concluir e Gerar Selo
                 </button>
             )}

             {isConfirmingFinish && (
               <div className="bg-gold-600/10 border border-gold-600/30 p-6 rounded-2xl space-y-4 animate-scale-in">
                 <div className="flex items-center gap-3 text-gold-500">
                    <AlertCircle size={20} />
                    <p className="text-xs font-black uppercase tracking-widest">Confirmar prestação do serviço?</p>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => setIsConfirmingFinish(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Ainda não</button>
                   <button onClick={() => handleUpdateStatus('completed')} className="flex-2 py-3 bg-gold-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg font-bold">Sim, Serviço Concluído</button>
                 </div>
               </div>
             )}

             {!isProfessional && (appt.status === 'pending' || appt.status === 'confirmed') && (
               <button onClick={() => handleUpdateStatus('cancelled', 'Cancelado pelo cliente')} className="w-full py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm">
                 Cancelar Agendamento
               </button>
             )}

             <button onClick={() => navigate(`/chat/${isProfessional ? appt.userId : appt.barberId}`)} className="w-full py-4 bg-zinc-800 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-zinc-700 transition-all">
               <MessageSquare size={18}/> {isProfessional ? 'Falar com Cliente' : 'Falar com Mestre'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
