
import { supabase } from './supabaseClient';
import { User, Appointment, Service, Barber, Message, Notification, Review } from '../types';
import { notificationService } from './notificationService';

// Inicializa serviço de notificação
// notificationService.init(); // EmailJS removido, agora usamos Supabase Function

// Constante global de horários padrão para garantir consistência
const GLOBAL_DEFAULT_HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export const api = {
  
  // --- CONFIGURAÇÕES DO SISTEMA (SMTP) ---
  async getAppConfig(): Promise<Record<string, string>> {
    const { data } = await supabase.from('app_config').select('*');
    if (!data) return {};
    return data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  },

  async updateAppConfig(key: string, value: string): Promise<void> {
    // Upsert para criar se não existir ou atualizar
    const { error } = await supabase
      .from('app_config')
      .upsert({ key, value });
    
    if (error) throw error;
  },

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

  // Atualiza dados do perfil (Role, Nome, Username, etc)
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const dbUpdates: any = {
        name: updates.name,
        username: updates.username,
        role: updates.role,
        phone: updates.phone // Atualiza telefone
    };
    if (updates.specialty !== undefined) dbUpdates.specialty = updates.specialty;
    
    // Se o email foi alterado no form, atualizamos aqui (embora auth precise de trigger para sync real)
    if (updates.email) dbUpdates.email = updates.email;

    await supabase.from('profiles').update(dbUpdates).eq('id', userId);
  },

  // Criação REAL de perfil pelo Admin (Bypassing Auth.signUp limitation via Profile Table)
  async createUserProfileStub(userData: Partial<User>, password?: string): Promise<void> {
    const fakeId = crypto.randomUUID();
    
    const insertData: any = {
        id: fakeId,
        email: userData.email, // Pode ser um email fictício user@local
        name: userData.name,
        username: userData.username,
        role: userData.role || 'customer',
        specialty: userData.specialty,
        phone: userData.phone
    };

    if (password) {
        insertData.legacy_password = password;
    }

    const { error } = await supabase.from('profiles').insert(insertData);
    
    if (error) {
        console.error("Erro ao criar usuário via Admin:", error);
        // Código de erro Postgres para violação de chave estrangeira
        if (error.code === '23503') { 
            throw new Error("BD Error: Execute 'scripts/update_users.sql' no Supabase para corrigir a restrição de chave estrangeira.");
        }
        throw new Error(error.message);
    }
  },

  // Reset REAL de Senha por Admin (Atualiza legacy_password)
  async adminResetUserPassword(userId: string, newPassword: string): Promise<void> {
      const { error } = await supabase
        .from('profiles')
        .update({ legacy_password: newPassword })
        .eq('id', userId);

      if (error) {
          console.error("Erro ao resetar senha:", error);
          throw new Error("Falha ao atualizar senha no banco de dados.");
      }
  },

  async checkUserExists(email: string): Promise<boolean> {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('email', email);
    return (count || 0) > 0;
  },

  // Novo método para verificar disponibilidade do username
  async checkUsernameExists(username: string): Promise<boolean> {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('username', username); // ilike para case-insensitive
    return (count || 0) > 0;
  },

  // Recupera perfil completo por identificador (Username ou Email) e verifica senha legacy
  async verifyLegacyLogin(identifier: string, password: string): Promise<User | null> {
      // Busca pelo email OU username
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${identifier},username.ilike.${identifier}`)
        .single();
      
      if (!data) return null;

      // Verifica a senha (em produção isso deveria ser hash, mas para o requisito atual usamos direto)
      if (data.legacy_password === password) {
          return this.mapProfileToUser(data);
      }

      return null;
  },

  // Novo método para recuperar email pelo username (para login)
  async getEmailByUsername(username: string): Promise<string | null> {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .ilike('username', username)
      .single();
    return data?.email || null;
  },

  mapProfileToUser(data: any): User {
    // Lógica de fallback de imagem (Estilo Ícone Peaky Blinders)
    let avatar = data.avatar_url;
    
    if (!avatar || avatar.trim() === '') {
        const encodedName = encodeURIComponent(data.name || 'U');
        // Cores do Tema: D4AF37 (Gold), 000000 (Black), 18181b (Zinc-900)
        
        if (data.role === 'barber' || data.role === 'barber-admin') {
            // Barbeiro/Dono: Destaque (Fundo Dourado, Letra Preta)
            avatar = `https://ui-avatars.com/api/?name=${encodedName}&background=D4AF37&color=000000&size=256&font-size=0.4&bold=true&length=2`;
        } else {
             // Cliente/Admin: Discreto (Fundo Escuro, Letra Dourada)
            avatar = `https://ui-avatars.com/api/?name=${encodedName}&background=18181b&color=D4AF37&size=256&font-size=0.4&bold=true&length=2`;
        }
    }

    return {
      id: data.id,
      name: data.name,
      username: data.username,
      email: data.email,
      phone: data.phone, // Mapeia telefone
      role: data.role,
      loyaltyStamps: data.loyalty_stamps || 0,
      avatarUrl: avatar,
      isAdmin: data.role === 'admin' || data.role === 'barber-admin',
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
      .in('role', ['barber', 'barber-admin']); // Inclui barber-admin na lista de profissionais
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
    
    let slots: string[] = [];
    
    if (config.dates && Array.isArray(config.dates[date])) {
        slots = config.dates[date];
    } else {
        slots = (config.default && config.default.length > 0) ? config.default : GLOBAL_DEFAULT_HOURS;
    }

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

    // --- LOGICA DE NOTIFICAÇÃO COMPLETA (EMAILS + IN-APP) ---
    const apptData: Appointment = {
        id: data.id,
        ...appt,
        createdAt: new Date().toISOString()
    } as Appointment;

    const services = await this.getServices();
    const serviceName = services.find(s => s.id === appt.serviceId)?.name || 'Serviço';

    // Recupera perfis de AMBAS as partes para envio de email
    const [barberProfile, clientProfile] = await Promise.all([
        this.getUserProfile(appt.barberId),
        this.getUserProfile(appt.userId)
    ]);

    // 1. Notificação no App (Sempre para quem não criou, ou ambos)
    if (statusToUse === 'pending') {
        // App Notification para o BARBEIRO (já existia)
        await this.addNotification({
            userId: appt.barberId,
            title: 'Nova Solicitação',
            message: `${appt.customerName} solicitou ${appt.date} às ${appt.time}`,
            type: 'appointment',
            link: `/appointment/${data.id}`
        });

        // App Notification para o CLIENTE (NOVO - Confirmação de envio)
        await this.addNotification({
            userId: appt.userId,
            title: 'Solicitação Enviada',
            message: `Aguardando confirmação do mestre para ${serviceName} em ${appt.date}.`,
            type: 'appointment',
            link: `/appointment/${data.id}`
        });

        // Email para o BARBEIRO
        if (barberProfile) {
            const msg = notificationService.formatAppointmentMessage('created', apptData, serviceName);
            notificationService.sendEmailNotification(barberProfile.name, barberProfile.email, "Nova Solicitação de Agendamento - Peaky Blinders", msg);
        }

        // Email para o CLIENTE (Confirmação de recebimento da solicitação)
        if (clientProfile) {
             const msgClient = `Olá ${clientProfile.name}, recebemos sua solicitação para ${serviceName} no dia ${appt.date} às ${appt.time}. Você será notificado assim que o mestre confirmar.`;
             notificationService.sendEmailNotification(clientProfile.name, clientProfile.email, "Solicitação Recebida - Peaky Blinders", msgClient);
        }

    } else if (statusToUse === 'confirmed') {
        // Se criado já confirmado (pelo Admin/Barbeiro)
        
        // App Notification para Cliente
        await this.addNotification({
            userId: appt.userId,
            title: 'Agendamento Realizado',
            message: `Agendamento confirmado: ${appt.date} às ${appt.time}.`,
            type: 'appointment',
            link: `/appointment/${data.id}`
        });
        
        // App Notification para Barbeiro (Garantia de registro no in-app)
         await this.addNotification({
            userId: appt.barberId,
            title: 'Agenda Atualizada',
            message: `Novo horário confirmado: ${appt.customerName} às ${appt.time}`,
            type: 'appointment',
            link: `/appointment/${data.id}`
        });

        // Email para CLIENTE
        if (clientProfile) {
            const msg = notificationService.formatAppointmentMessage('confirmed', apptData, serviceName);
            notificationService.sendEmailNotification(clientProfile.name, clientProfile.email, "Agendamento Confirmado - Peaky Blinders", msg);
        }

        // Email para BARBEIRO (Confirmação de bloqueio na agenda)
        if (barberProfile) {
            const msgBarber = `Novo agendamento confirmado na sua agenda: ${appt.customerName} - ${serviceName} - ${appt.date} às ${appt.time}.`;
            notificationService.sendEmailNotification(barberProfile.name, barberProfile.email, "Agenda Atualizada - Peaky Blinders", msgBarber);
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
    if (!appt) return;

    // --- LOGICA DE NOTIFICAÇÃO COMPLETA (ATUALIZAÇÃO) ---
    const services = await this.getServices();
    const serviceName = services.find(s => s.id === appt.serviceId)?.name || 'Serviço';
    
    // Recupera perfis
    const [barberProfile, clientProfile] = await Promise.all([
        this.getUserProfile(appt.barberId),
        this.getUserProfile(appt.userId)
    ]);

    // 1. Lógica de Pontos de Fidelidade
    if (status === 'completed') {
        if (clientProfile) {
          await supabase.from('profiles').update({ loyalty_stamps: clientProfile.loyaltyStamps + 1 }).eq('id', appt.userId);
        }
    }

    // 2. Notificações no App (IN-APP)
    
    // SEMPRE Envia para o Cliente
    await this.addNotification({
        userId: appt.userId,
        title: `Agendamento ${status === 'confirmed' ? 'Confirmado' : status === 'cancelled' ? 'Cancelado' : 'Concluído'}`,
        message: status === 'cancelled' && reason ? `Motivo: ${reason}` : `Seu horário para ${appt.date} foi atualizado.`,
        type: 'system',
        link: `/appointment/${appt.id}`
    });

    // SEMPRE Envia para o Barbeiro (Confirmação, Conclusão e Cancelamento)
    // Antes era apenas 'cancelled'. Agora cobre todo o ciclo de vida.
    let barberTitle = 'Atualização de Agenda';
    let barberMsg = `O agendamento de ${appt.customerName} mudou para ${status}.`;
    
    if (status === 'confirmed') {
        barberTitle = 'Agendamento Confirmado';
        barberMsg = `${appt.customerName} confirmado para ${appt.time}.`;
    } else if (status === 'completed') {
        barberTitle = 'Serviço Finalizado';
        barberMsg = `Corte de ${appt.customerName} registrado com sucesso.`;
    } else if (status === 'cancelled') {
        barberTitle = 'Agendamento Cancelado';
        barberMsg = `Cancelamento: ${appt.customerName} (${appt.time}).`;
    }

    await this.addNotification({
        userId: appt.barberId,
        title: barberTitle,
        message: barberMsg,
        type: 'appointment',
        link: `/appointment/${appt.id}`
    });


    // 3. EMAILS TRANSACIONAIS (PARA AMBOS)
    
    // Email para o CLIENTE
    if (clientProfile) {
         let subject = "Atualização de Agendamento";
         let msg = "";

         if (status === 'confirmed') {
             subject = "Agendamento Confirmado! - Peaky Blinders";
             msg = notificationService.formatAppointmentMessage('confirmed', appt, serviceName);
         } else if (status === 'completed') {
             subject = "Obrigado pela visita! - Peaky Blinders";
             msg = `Olá ${clientProfile.name}, obrigado por cortar conosco! Seu serviço de ${serviceName} foi concluído. Esperamos vê-lo em breve.`;
         } else if (status === 'cancelled') {
             subject = "Agendamento Cancelado - Peaky Blinders";
             msg = notificationService.formatAppointmentMessage('cancelled', appt, serviceName, reason);
         }

         notificationService.sendEmailNotification(clientProfile.name, clientProfile.email, subject, msg);
    }

    // Email para o BARBEIRO
    if (barberProfile) {
        let subject = "Atualização de Agenda";
        let msg = "";

        if (status === 'confirmed') {
            subject = "Agendamento Confirmado";
            msg = `O agendamento de ${appt.customerName} para ${appt.date} às ${appt.time} foi confirmado.`;
        } else if (status === 'completed') {
            subject = "Serviço Registrado";
            msg = `O serviço de ${appt.customerName} (${serviceName}) foi marcado como concluído.`;
        } else if (status === 'cancelled') {
            subject = "Agendamento Cancelado";
            msg = `O agendamento de ${appt.customerName} para ${appt.date} às ${appt.time} foi cancelado. Motivo: ${reason || 'Não informado'}.`;
        }

        notificationService.sendEmailNotification(barberProfile.name, barberProfile.email, subject, msg);
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
    // 1. Salvar no Banco
    await supabase.from('messages').insert({
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      text: msg.text
    });

    // 2. Notificação por E-MAIL (NOVO)
    try {
        const [sender, receiver] = await Promise.all([
            this.getUserProfile(msg.senderId),
            this.getUserProfile(msg.receiverId)
        ]);

        if (sender && receiver && receiver.email) {
            const emailMsg = notificationService.formatChatMessage(sender.name, msg.text);
            notificationService.sendEmailNotification(
                receiver.name, 
                receiver.email, 
                `Nova Mensagem de ${sender.name} - Peaky Blinders`, 
                emailMsg
            );
        }
    } catch (e) {
        console.error("Erro ao enviar notificação de mensagem por email", e);
        // Não quebra o fluxo se o email falhar
    }
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
    // 1. Inserir a review
    await supabase.from('reviews').insert({
      appointment_id: review.appointmentId,
      barber_id: review.barberId,
      user_id: review.userId,
      rating: review.rating,
      comment: review.comment
    });

    // 2. Notificar o barbeiro In-App (inclui barber e barber-admin)
    await this.addNotification({
        userId: review.barberId,
        title: 'Nova Avaliação',
        message: `Você recebeu ${review.rating} estrelas de ${review.userName}!`,
        type: 'system',
        link: `/appointment/${review.appointmentId}`
    });

    // 3. Notificar o Barbeiro por EMAIL (NOVO)
    const barberProfile = await this.getUserProfile(review.barberId);
    if (barberProfile) {
        const msg = `Parabéns! ${review.userName} avaliou seu serviço com ${review.rating} estrelas. ${review.comment ? `Comentário: "${review.comment}"` : ''}`;
        notificationService.sendEmailNotification(barberProfile.name, barberProfile.email, "Você recebeu uma Nova Avaliação! - Peaky Blinders", msg);
    }
  }
};
