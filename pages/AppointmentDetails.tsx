
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate, useLocation } = ReactRouterDOM;
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, Review, Service, Barber, User } from '../types';
import { ChevronLeft, Calendar, Clock, Scissors, User as UserIcon, MessageSquare, AlertCircle, CheckCircle, XCircle, Check, X, ShieldAlert, Star, Send, AlertTriangle } from 'lucide-react';

export const AppointmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [service, setService] = useState<Service | undefined>(undefined);
  const [barber, setBarber] = useState<Barber | undefined>(undefined);
  const [customer, setCustomer] = useState<User | undefined>(undefined);
  
  const [isRefusing, setIsRefusing] = useState(false);
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');

  // Client Cancel State
  const [clientCancelModalOpen, setClientCancelModalOpen] = useState(false);
  const [clientCancelReason, setClientCancelReason] = useState('');
  
  // Novo estado para o modal de aviso de 2h
  const [showCancellationWarning, setShowCancellationWarning] = useState(false);

  // Review State
  const [existingReview, setExistingReview] = useState<Review | undefined>(undefined);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadAppt();
    
    // Check if we came from a successful booking
    if (location.state?.bookingSuccess) {
      setShowSuccessModal(true);
      // Clear history state to avoid showing it on refresh (optional, but good UX)
      window.history.replaceState({}, document.title);
    }
  }, [id, user, location]);

  const loadAppt = async () => {
    if (id) {
      const data = await api.getAppointmentById(id);
      if (data) {
        setAppt(data);
        const review = await api.getReviewByAppointment(data.id);
        setExistingReview(review);
        
        // Fetch relations
        const services = await api.getServices();
        setService(services.find(s => s.id === data.serviceId));
        
        const barbers = await api.getBarbers();
        setBarber(barbers.find(b => b.id === data.barberId));

        if (data.userId) {
          const customerProfile = await api.getUserProfile(data.userId);
          if(customerProfile) setCustomer(customerProfile);
        }
        
      } else navigate('/');
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0 || !appt || !user) return;
    
    await api.addReview({
      appointmentId: appt.id,
      barberId: appt.barberId,
      userId: user.id,
      userName: user.name,
      rating: rating,
      comment: comment
    });

    const newReview: Review = {
      id: 'temp', 
      appointmentId: appt.id,
      barberId: appt.barberId,
      userId: user.id,
      userName: user.name,
      rating: rating,
      comment: comment,
      date: new Date().toISOString()
    };
    
    setExistingReview(newReview);
    setShowReviewModal(false);
  };

  const handleBack = () => {
    // 1. Se existe um histórico de origem específico (passado via state), use-o.
    if (location.state?.from) {
        // Se houver um returnTab, passamos ele de volta no state para restaurar a aba
        const stateToPass = location.state.returnTab ? { initialTab: location.state.returnTab } : {};
        navigate(location.state.from, { state: stateToPass });
        return;
    }

    // 2. Fallback inteligente baseado no Role do usuário
    if (user?.role === 'admin' || user?.role === 'barber-admin') {
        navigate('/admin');
    } else if (user?.role === 'barber') {
        navigate('/barber');
    } else {
        navigate('/profile'); // Clientes geralmente veem detalhes a partir do perfil
    }
  };

  // Navega para o chat passando a localização atual e os dados de retorno para persistência
  const goToChat = (targetId: string) => {
      navigate(`/chat/${targetId}`, { 
          state: { 
              from: location.pathname,
              // Preserva a informação de onde veio originalmente para poder voltar corretamente depois
              returnPath: location.state?.from, 
              returnTab: location.state?.returnTab 
          } 
      });
  };

  if (!appt) return null;

  // CORREÇÃO: Inclui 'barber-admin' na lógica de permissões profissionais
  const isProfessional = user?.role === 'admin' || user?.role === 'barber' || user?.role === 'barber-admin';

  const handleUpdateStatus = async (status: Appointment['status'], reason?: string) => {
    if (!appt) return;
    await api.updateAppointmentStatus(appt.id, status, reason);
    setIsRefusing(false);
    setClientCancelModalOpen(false);
    setIsConfirmingFinish(false);
    loadAppt();
  };

  const handleClientCancelClick = () => {
    // Validação de 2 horas
    const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
    const now = new Date();
    const diffInMs = apptDateTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 2) {
      setShowCancellationWarning(true);
      return;
    }

    setClientCancelReason('');
    setClientCancelModalOpen(true);
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
    <div className="max-w-xl mx-auto space-y-8 pb-20 animate-fade-in relative">
      <button onClick={handleBack} className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-gold-500 transition-colors">
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
                <img src={barber?.avatarUrl} className="w-12 h-12 rounded-full object-cover grayscale border-2 border-zinc-800" />
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Mestre Barbeiro</span>
                  <h4 className="font-bold text-lg dark:text-white">{barber?.name}</h4>
                  <p className="text-xs text-zinc-500 font-bold uppercase">{barber?.specialty}</p>
                </div>
             </div>

             {isProfessional && (
               <div className="flex items-center gap-4 bg-zinc-50 dark:bg-black/20 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <img src={customer?.avatarUrl} className="w-12 h-12 rounded-full object-cover bg-zinc-800 border-2 border-gold-500/20" />
                <div>
                  <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Cliente Shelby</span>
                  <h4 className="font-bold text-lg dark:text-white">{appt.customerName}</h4>
                  {customer?.username && <p className="text-xs text-zinc-500">@{customer.username}</p>}
                </div>
             </div>
             )}
          </div>

          {/* VISIBILIDADE DA AVALIAÇÃO: Se existe, mostra para TODOS. Se não existe, mostra botão apenas para cliente e se concluído */}
          {existingReview ? (
            <div className="animate-fade-in">
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 border-dashed border-t mb-8"></div>
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-gold-500/30 p-6 rounded-2xl text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gold-600"></div>
                <h4 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">Avaliação do Cliente</h4>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={20} className={s <= existingReview.rating ? 'fill-gold-500 text-gold-500' : 'text-zinc-300'} />
                  ))}
                </div>
                {existingReview.comment && (
                    <p className="text-sm text-zinc-500 italic">"{existingReview.comment}"</p>
                )}
                {isProfessional && (
                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-2">Avaliação Recebida</p>
                )}
              </div>
            </div>
          ) : (
             appt.status === 'completed' && !isProfessional && (
                <div className="animate-fade-in">
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 border-dashed border-t mb-8"></div>
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="w-full py-5 bg-gold-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-gold-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Star size={18} className="fill-white" /> Avaliar Atendimento
                  </button>
                </div>
             )
          )}

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
                  <p className="text-[10px] font-black uppercase text-red-600">Justifique a {appt.status === 'confirmed' ? 'cancelamento' : 'recusa'}</p>
                  <textarea value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} placeholder="Ex: Indisponibilidade emergencial..." className="w-full bg-white dark:bg-black border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-sm focus:outline-none text-white" />
                  <div className="flex gap-2">
                    <button onClick={() => setIsRefusing(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Voltar</button>
                    <button disabled={!refusalReason.trim()} onClick={() => handleUpdateStatus('cancelled', refusalReason)} className="flex-2 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-lg">Confirmar</button>
                  </div>
               </div>
             )}
             
             {/* Modal de Cancelamento do Cliente */}
             {clientCancelModalOpen && (
               <div className="space-y-4 animate-slide-up bg-red-50 dark:bg-red-900/5 p-6 rounded-2xl border border-red-100 dark:border-red-900/20">
                  <p className="text-[10px] font-black uppercase text-red-600">Por que deseja cancelar?</p>
                  <textarea 
                    value={clientCancelReason} 
                    onChange={(e) => setClientCancelReason(e.target.value)} 
                    placeholder="Informe o motivo..." 
                    className="w-full bg-white dark:bg-black border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-sm focus:outline-none text-white" 
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setClientCancelModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Voltar</button>
                    <button 
                      disabled={!clientCancelReason.trim()} 
                      onClick={() => handleUpdateStatus('cancelled', `Cancelado pelo cliente: ${clientCancelReason}`)} 
                      className="flex-2 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 shadow-lg"
                    >
                      Confirmar Cancelamento
                    </button>
                  </div>
               </div>
             )}

             {isProfessional && appt.status === 'confirmed' && !isConfirmingFinish && !isRefusing && (
               <div className="flex gap-3">
                   <button onClick={() => setIsConfirmingFinish(true)} className="flex-[2] py-4 bg-gold-600 text-black font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                       <CheckCircle size={18}/> Concluir e Gerar Selo
                   </button>
                   <button onClick={() => setIsRefusing(true)} className="flex-1 py-4 bg-red-600/10 text-red-500 border border-red-600/30 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                       <X size={18}/> Cancelar
                   </button>
               </div>
             )}

             {isConfirmingFinish && (
               <div className="bg-gold-600/10 border border-gold-600/30 p-6 rounded-2xl space-y-4 animate-scale-in">
                 <div className="flex items-center gap-3 text-gold-500">
                    <AlertCircle size={20} />
                    <p className="text-xs font-black uppercase tracking-widest">Confirmar prestação do serviço?</p>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => setIsConfirmingFinish(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-zinc-500">Ainda não</button>
                   <button onClick={() => handleUpdateStatus('completed')} className="flex-[2] px-6 py-3 bg-gold-600 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg font-bold">Sim, Serviço Concluído</button>
                 </div>
               </div>
             )}

             {!isProfessional && (appt.status === 'pending' || appt.status === 'confirmed') && !clientCancelModalOpen && (
               <button onClick={handleClientCancelClick} className="w-full py-4 bg-red-600/10 text-red-500 border border-red-600/20 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm">
                 Cancelar Agendamento
               </button>
             )}

             <button 
                onClick={() => goToChat(isProfessional ? appt.userId : appt.barberId)} 
                className="w-full py-4 bg-zinc-800 dark:bg-zinc-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-md hover:bg-zinc-700 transition-all"
             >
               <MessageSquare size={18}/> {isProfessional ? 'Falar com Cliente' : 'Falar com Mestre'}
             </button>
          </div>
        </div>
      </div>
      
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
      
      {/* Success Booking Modal Overlay */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-scale-in">
           <div className="text-center space-y-8 max-w-sm">
              <div className="w-24 h-24 bg-gold-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(212,175,55,0.4)] animate-bounce-in">
                 <Check size={48} className="text-black" strokeWidth={3} />
              </div>
              <div>
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Reserva Enviada!</h2>
                <p className="text-zinc-400 leading-relaxed text-sm">
                   Sua solicitação foi enviada com sucesso para o mestre barbeiro.
                </p>
                <div className="mt-6 bg-zinc-900 border border-zinc-800 p-4 rounded-xl inline-block">
                    <p className="text-[10px] font-black uppercase text-gold-600 tracking-widest mb-1 flex items-center justify-center gap-2">
                       <Clock size={12}/> Aguardando Confirmação
                    </p>
                    <p className="text-xs text-zinc-500">Você será notificado assim que aprovado.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-zinc-200 transition-colors"
              >
                Entendido
              </button>
           </div>
        </div>,
        document.body
      )}

      {/* Modal de Avaliação */}
      {showReviewModal && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl relative">
            <button onClick={() => setShowReviewModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24}/></button>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-serif font-bold text-white mb-2">Avalie sua Experiência</h3>
              <p className="text-zinc-500 text-xs">Como foi o serviço com {barber?.name}?</p>
            </div>

            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-90"
                >
                  <Star 
                    size={32} 
                    className={`transition-colors ${star <= rating ? 'fill-gold-500 text-gold-500' : 'text-zinc-700 hover:text-gold-500/50'}`} 
                  />
                </button>
              ))}
            </div>

            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Deixe um comentário (opcional)..."
              className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-gold-600 h-24 resize-none mb-6"
            />

            <button 
              disabled={rating === 0}
              onClick={handleSubmitReview}
              className="w-full py-4 bg-gold-600 text-black font-black uppercase text-xs tracking-widest rounded-xl shadow-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Enviar Avaliação
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
