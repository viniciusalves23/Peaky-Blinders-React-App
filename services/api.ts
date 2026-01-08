
import { supabase } from './supabaseClient';
import { User, Appointment, Service, Barber, Message, Notification, Review } from '../types';

// Constante global de horários padrão para garantir consistência
const GLOBAL_DEFAULT_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const api = {
  
  // --- USERS & PROFILES ---
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    return this.mapProfileToUser(data);
  },

  async getAllUsers(): Promise<User[]> {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map(data => this.mapProfileToUser(data));
  },

  async checkUserExists(email: string): Promise<boolean> {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('email', email);
    return (count || 0) > 0;
  },

  mapProfileToUser(data: any): User {
    // Lógica de fallback de imagem (Estilo Ícone Peaky Blinders)
    let avatar = data.avatar_url;
    
    if (!avatar || avatar.trim() === '') {
        const encodedName = encodeURIComponent(data.name || 'U');
        // Cores do Tema: D4AF37 (Gold), 000000 (Black), 18181b (Zinc-900)
        
        if (data.role === 'barber') {
            // Barbeiro: Destaque (Fundo Dourado, Letra Preta)
            avatar = `https://ui-avatars.com/api/?name=${encodedName}&background=D4AF37&color=000000&size=256&font-size=0.4&bold=true&length=2`;
        } else {
             // Cliente/Admin: Discreto (Fundo Escuro, Letra Dourada)
            avatar = `https://ui-avatars.com/api/?name=${encodedName}&background=18181b&color=D4AF37&size=256&font-size=0.4&bold=true&length=2`;
        }
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      loyaltyStamps: data.loyalty_stamps || 0,
      avatarUrl: avatar,
      isAdmin: data.role === 'admin',
      specialty: data.specialty,
      portfolio: data.portfolio || [],
      rating: data.rating ? parseFloat(data.rating) : 5.0,
      bio: data.bio
    };
  },

  async deleteUser(userId: string): Promise<void> {
    await supabase.from('profiles').delete().eq('id', userId);
  },

  async uploadProfilePicture(userId: string, file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // Atualiza o perfil com a nova URL
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      return null;
    }
  },

  // --- SERVICES & BARBERS ---
  async getServices(): Promise<Service[]> {
    const { data } = await supabase.from('services').select('*').eq('active', true);
    return data || [];
  },

  async getBarbers(): Promise<Barber[]> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'barber');
    return (data || []).map(data => this.mapProfileToUser(data));
  },

  // --- APPOINTMENTS & AVAILABILITY ---
  async getAvailableSlots(barberId: string, date: string): Promise<string[]> {
    // 1. Configuração do Barbeiro
    const { data: profile } = await supabase
      .from('profiles')
      .select('availability')
      .eq('id', barberId)
      .single();

    if (!profile) return [];

    const config = profile.availability || {};
    
    // LÓGICA CORRIGIDA E ROBUSTA:
    let slots: string[] = [];
    
    // Se existe uma chave específica para a data, usa ela (mesmo que seja array vazio = dia fechado)
    if (config.dates && Array.isArray(config.dates[date])) {
        slots = config.dates[date];
    } else {
        // Fallback para o default configurado pelo barbeiro ou o global
        slots = (config.default && config.default.length > 0) ? config.default : GLOBAL_DEFAULT_HOURS;
    }

    // Se a lista de slots estiver vazia, significa dia fechado, retorna vazio direto
    if (slots.length === 0) return [];

    // 2. Agendamentos Ocupados
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('time')
      .eq('barber_id', barberId)
      .eq('date', date)
      .neq('status', 'cancelled');

    const occupiedTimes = new Set(existingAppts?.map(a => a.time) || []);

    return slots.filter(time => !occupiedTimes.has(time)).sort();
  },

  async getAppointments(): Promise<Appointment[]> {
    const { data } = await supabase.from('appointments').select('*');
    return (data || []).map(a => ({
      id: a.id,
      serviceId: a.service_id,
      barberId: a.barber_id,
      date: a.date,
      time: a.time,
      status: a.status as any,
      userId: a.user_id,
      customerName: a.customer_name || 'Cliente',
      createdAt: a.created_at,
      refusalReason: a.refusal_reason
    }));
  },

  async getAppointmentById(id: string): Promise<Appointment | undefined> {
    const { data } = await supabase.from('appointments').select('*').eq('id', id).single();
    if (!data) return undefined;
    return {
      id: data.id,
      serviceId: data.service_id,
      barberId: data.barber_id,
      date: data.date,
      time: data.time,
      status: data.status as any,
      userId: data.user_id,
      customerName: data.customer_name || 'Cliente',
      createdAt: data.created_at,
      refusalReason: data.refusal_reason
    };
  },

  async createAppointment(appt: Omit<Appointment, 'id' | 'createdAt'>): Promise<string | null> {
    // Validação final de concorrência
    const { data: busy } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', appt.barberId)
      .eq('date', appt.date)
      .eq('time', appt.time)
      .neq('status', 'cancelled');

    if (busy && busy.length > 0) return null;

    // FIX: Usa o status passado no objeto (confirmed se for lançamento direto, pending se for cliente)
    const statusToUse = appt.status || 'pending';

    const { data, error } = await supabase.from('appointments').insert({
      service_id: appt.serviceId,
      barber_id: appt.barberId,
      user_id: appt.userId,
      customer_name: appt.customerName,
      date: appt.date,
      time: appt.time,
      status: statusToUse
    }).select().single();

    if (error || !data) return null;

    // Lógica de Notificação Inteligente
    if (statusToUse === 'pending') {
      // Se for pendente, significa que foi o cliente -> Notifica o Barbeiro
      await this.addNotification({
        userId: appt.barberId,
        title: 'Nova Solicitação',
        message: `${appt.customerName} solicitou ${appt.date} às ${appt.time}`,
        type: 'appointment',
        link: `/appointment/${data.id}`
      });
    } else if (statusToUse === 'confirmed') {
      // Se for confirmado direto, significa que foi o barbeiro -> Notifica o Cliente (se for membro registrado)
      // Verifica se não é um agendamento 'Guest' onde o userId é o próprio barbeiro
      if (appt.userId !== appt.barberId) {
        await this.addNotification({
          userId: appt.userId,
          title: 'Agendamento Realizado',
          message: `O mestre agendou um horário para você: ${appt.date} às ${appt.time}.`,
          type: 'appointment',
          link: `/appointment/${data.id}`
        });
      }
    }

    return data.id;
  },

  async updateAppointmentStatus(id: string, status: Appointment['status'], reason?: string): Promise<void> {
    await supabase.from('appointments').update({
      status,
      refusal_reason: reason
    }).eq('id', id);

    const appt = await this.getAppointmentById(id);
    if (appt) {
      if (status === 'completed') {
        const profile = await this.getUserProfile(appt.userId);
        if (profile) {
          await supabase.from('profiles').update({ loyalty_stamps: profile.loyaltyStamps + 1 }).eq('id', appt.userId);
        }
      }

      // Notifica o Cliente (Sempre)
      await this.addNotification({
        userId: appt.userId,
        title: `Agendamento ${status === 'confirmed' ? 'Confirmado' : status === 'cancelled' ? 'Cancelado' : 'Concluído'}`,
        message: status === 'cancelled' && reason ? `Motivo: ${reason}` : 'Verifique os detalhes no app.',
        type: 'system',
        link: `/appointment/${appt.id}`
      });

      // Notifica o Barbeiro (Especificamente se for cancelado)
      // Isso garante que o barbeiro saiba se o cliente cancelou
      if (status === 'cancelled') {
        await this.addNotification({
          userId: appt.barberId,
          title: 'Agendamento Cancelado',
          message: `O agendamento de ${appt.customerName} (${appt.date} às ${appt.time}) foi cancelado. ${reason ? `Motivo: ${reason}` : ''}`,
          type: 'appointment',
          link: `/appointment/${appt.id}`
        });
      }
    }
  },

  async getBarberSettings(barberId: string): Promise<{ defaultHours: string[], dates: Record<string, string[]> }> {
    const { data } = await supabase.from('profiles').select('availability').eq('id', barberId).single();
    if (!data || !data.availability) {
        return { 
            defaultHours: GLOBAL_DEFAULT_HOURS, 
            dates: {} 
        };
    }
    const av = data.availability as any;
    // Garante que defaultHours nunca seja undefined
    return {
        defaultHours: (av.default && av.default.length > 0) ? av.default : GLOBAL_DEFAULT_HOURS,
        dates: av.dates || {}
    };
  },

  async saveBarberSettings(barberId: string, settings: { defaultHours: string[], dates: any }): Promise<void> {
    const jsonbData = {
        default: settings.defaultHours,
        dates: settings.dates
    };
    await supabase.from('profiles').update({ availability: jsonbData }).eq('id', barberId);
  },

  async saveBarberSettingsForDate(barberId: string, date: string, hours: string[]): Promise<void> {
    const current = await this.getBarberSettings(barberId);
    const dates = { ...current.dates, [date]: hours };
    await this.saveBarberSettings(barberId, {
      defaultHours: current.defaultHours,
      dates
    });
  },

  async resetBarberDateToDefault(barberId: string, date: string): Promise<void> {
    const current = await this.getBarberSettings(barberId);
    const newDates = { ...current.dates };
    
    // Remove a chave específica da data
    delete newDates[date]; 
    
    await this.saveBarberSettings(barberId, {
      defaultHours: current.defaultHours,
      dates: newDates
    });
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    return (data || []).map(n => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: n.type as any,
      link: n.link,
      read: n.is_read,
      timestamp: n.created_at
    }));
  },

  async addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      link: notif.link
    });
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  },

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return count || 0;
  },

  // --- MESSAGES ---
  async getMessages(userId: string): Promise<Message[]> {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    return (data || []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      text: m.text,
      read: m.is_read,
      timestamp: m.created_at
    }));
  },

  async sendMessage(msg: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<void> {
    await supabase.from('messages').insert({
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      text: msg.text
    });
  },

  async markMessagesAsRead(userId: string, senderId: string): Promise<void> {
    await supabase.from('messages')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId)
      .eq('is_read', false);
  },

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    return count || 0;
  },
  
  async getConversations(userId: string): Promise<{ user: User, lastMessage: Message }[]> {
    const messages = await this.getMessages(userId);
    const usersMap = new Map<string, Message>();
    
    messages.forEach(m => {
      const otherId = m.senderId === userId ? m.receiverId : m.senderId;
      usersMap.set(otherId, m);
    });

    const results: { user: User, lastMessage: Message }[] = [];
    const ids = Array.from(usersMap.keys());
    
    if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
        profiles?.forEach(p => {
            const lastMsg = usersMap.get(p.id);
            if (lastMsg) {
                results.push({
                    user: this.mapProfileToUser(p),
                    lastMessage: lastMsg
                });
            }
        });
    }
    
    return results.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
  },

  // --- REVIEWS ---
  async getReviewsByBarber(barberId: string): Promise<Review[]> {
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles:user_id(name)')
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    return (data || []).map((r: any) => ({
      id: r.id,
      appointmentId: r.appointment_id,
      barberId: r.barber_id,
      userId: r.user_id,
      userName: r.profiles?.name || 'Anônimo',
      rating: r.rating,
      comment: r.comment,
      date: r.created_at
    }));
  },

  async getReviewByAppointment(appointmentId: string): Promise<Review | undefined> {
    const { data } = await supabase.from('reviews').select('*, profiles:user_id(name)').eq('appointment_id', appointmentId).single();
    if (!data) return undefined;
    return {
      id: data.id,
      appointmentId: data.appointment_id,
      barberId: data.barber_id,
      userId: data.user_id,
      userName: (data as any).profiles?.name || 'Anônimo',
      rating: data.rating,
      comment: data.comment,
      date: data.created_at
    };
  },

  async addReview(review: Omit<Review, 'id' | 'date'>): Promise<void> {
    await supabase.from('reviews').insert({
      appointment_id: review.appointmentId,
      barber_id: review.barberId,
      user_id: review.userId,
      rating: review.rating,
      comment: review.comment
    });
  }
};
