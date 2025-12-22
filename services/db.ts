
import { User, Appointment, Service, Barber, Message, Notification, Review } from '../types';

const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Corte Shelby (Undercut)', duration: 45, price: 60, description: 'Undercut clássico com topo texturizado. Acabamento na navalha.' },
  { id: '2', name: 'Barba Terapia (Toalha Quente)', duration: 30, price: 45, description: 'Barba tradicional com navalha, toalhas quentes e óleos essenciais.' },
  { id: '3', name: 'Experiência Peaky Completa', duration: 75, price: 90, description: 'Corte de Cabelo + Barba + Massagem Facial.' },
  { id: '4', name: 'Alinhamento de Barba', duration: 30, price: 35, description: 'Aparo preciso e desenho dos contornos da barba.' }
];

const INITIAL_BARBERS: Barber[] = [
  { id: 'b1', name: 'Arthur S.', specialty: 'Cortes Clássicos', rating: 4.9, avatar: 'https://picsum.photos/id/1005/200/200', portfolio: ['https://picsum.photos/id/1012/400/500', 'https://picsum.photos/id/1025/400/500', 'https://picsum.photos/id/1005/400/500'], userId: 'barber1' },
  { id: 'b2', name: 'Thomas B.', specialty: 'Degradê Navalhado', rating: 5.0, avatar: 'https://picsum.photos/id/1062/200/200', portfolio: ['https://picsum.photos/id/1011/400/500', 'https://picsum.photos/id/1/400/500', 'https://picsum.photos/id/338/400/500'] },
  { id: 'b3', name: 'Alfie S.', specialty: 'Especialista em Barba', rating: 4.8, avatar: 'https://picsum.photos/id/1074/200/200', portfolio: ['https://picsum.photos/id/1027/400/500', 'https://picsum.photos/id/22/400/500', 'https://picsum.photos/id/64/400/500'] }
];

const KEYS = {
  USERS: 'pb_users',
  APPOINTMENTS: 'pb_appointments',
  MESSAGES: 'pb_messages',
  BARBER_SETTINGS: 'pb_barber_settings',
  NOTIFICATIONS: 'pb_notifications',
  REVIEWS: 'pb_reviews'
};

class DatabaseService {
  constructor() { this.init(); }

  private init() {
    if (!localStorage.getItem(KEYS.USERS)) {
      const users: User[] = [
        { id: 'admin', name: 'Thomas Shelby (Suporte)', email: 'admin@peaky.com', password: 'admin', loyaltyStamps: 10, role: 'admin', isAdmin: true },
        { id: 'barber1', name: 'Arthur S.', email: 'barbeiro1@peaky.com', password: 'barbeiro', loyaltyStamps: 0, role: 'barber', isAdmin: false },
        { id: 'customer1', name: 'Cliente Shelby', email: 'cliente@peaky.com', password: 'cliente', loyaltyStamps: 3, role: 'customer', isAdmin: false }
      ];
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
    if (!localStorage.getItem(KEYS.APPOINTMENTS)) localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.MESSAGES)) localStorage.setItem(KEYS.MESSAGES, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.NOTIFICATIONS)) localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
    if (!localStorage.getItem(KEYS.REVIEWS)) localStorage.setItem(KEYS.REVIEWS, JSON.stringify([]));
    
    if (!localStorage.getItem(KEYS.BARBER_SETTINGS)) {
      const defaultHours = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
      const defaultSettings = {
        'b1': { defaultHours, dates: {} },
        'b2': { defaultHours, dates: {} },
        'b3': { defaultHours, dates: {} }
      };
      localStorage.setItem(KEYS.BARBER_SETTINGS, JSON.stringify(defaultSettings));
    }
  }

  getUsers(): User[] { return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'); }
  getAppointments(): Appointment[] { return JSON.parse(localStorage.getItem(KEYS.APPOINTMENTS) || '[]'); }
  getAppointmentById(id: string): Appointment | undefined { return this.getAppointments().find(a => a.id === id); }
  
  createAppointment(appt: Appointment): boolean {
    const available = this.getAvailableSlots(appt.barberId, appt.date);
    if (!available.includes(appt.time)) return false;

    const appts = this.getAppointments();
    appts.push(appt);
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(appts));
    
    this.addNotification({
      userId: appt.barberId === 'b1' ? 'barber1' : appt.barberId, 
      title: 'Nova Reserva Recebida',
      message: `${appt.customerName} agendou para ${new Date(appt.date + 'T12:00:00').toLocaleDateString()} às ${appt.time}.`,
      type: 'appointment',
      link: `/appointment/${appt.id}`
    });
    return true;
  }
  
  updateAppointmentStatus(id: string, status: Appointment['status'], reason?: string): void {
    const allAppts = this.getAppointments();
    const apptIndex = allAppts.findIndex(a => a.id === id);
    
    if (apptIndex === -1) return;

    const currentAppt = allAppts[apptIndex];
    // Atualiza apenas o que mudou
    const updatedAppt = { ...currentAppt, status, refusalReason: reason || currentAppt.refusalReason };
    allAppts[apptIndex] = updatedAppt;
    
    localStorage.setItem(KEYS.APPOINTMENTS, JSON.stringify(allAppts));

    // Lógica de Notificações para o Cliente
    const barberName = this.getBarbers().find(b => b.id === updatedAppt.barberId)?.name || 'Barbeiro';
    
    if (status === 'confirmed') {
      this.addNotification({
        userId: updatedAppt.userId,
        title: 'Agendamento Confirmado',
        message: `Seu horário com ${barberName} foi confirmado para ${updatedAppt.time}.`,
        type: 'appointment',
        link: `/appointment/${updatedAppt.id}`
      });
    } else if (status === 'completed') {
      // Adiciona selo de fidelidade
      const users = this.getUsers();
      const uIdx = users.findIndex(u => u.id === updatedAppt.userId);
      if (uIdx > -1) {
        users[uIdx].loyaltyStamps += 1;
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }

      this.addNotification({
        userId: updatedAppt.userId,
        title: 'Serviço Concluído',
        message: `Obrigado pela preferência! Avalie seu atendimento com ${barberName}.`,
        type: 'system',
        link: `/appointment/${updatedAppt.id}`
      });
    } else if (status === 'cancelled') {
      this.addNotification({
        userId: updatedAppt.userId,
        title: 'Agendamento Cancelado',
        message: `Cancelamento: ${reason || 'Motivo não informado'}.`,
        type: 'system',
        link: `/appointment/${updatedAppt.id}`
      });
    }
  }

  getBarberSettings(barberId: string) { 
    const all = JSON.parse(localStorage.getItem(KEYS.BARBER_SETTINGS) || '{}');
    return all[barberId] || { defaultHours: [], dates: {} }; 
  }

  getBarberHoursForDate(barberId: string, date: string): string[] {
    const settings = this.getBarberSettings(barberId);
    const rawHours = settings.dates[date] !== undefined ? settings.dates[date] : settings.defaultHours;
    return [...rawHours].sort((a, b) => a.localeCompare(b));
  }

  saveBarberSettingsForDate(barberId: string, date: string, hours: string[], cancellationReason?: string) {
    const all = JSON.parse(localStorage.getItem(KEYS.BARBER_SETTINGS) || '{}');
    if (!all[barberId]) all[barberId] = { defaultHours: [], dates: {} };
    
    const sortedHours = [...hours].sort((a, b) => a.localeCompare(b));
    const oldHours = this.getBarberHoursForDate(barberId, date);
    const removedHours = oldHours.filter(h => !sortedHours.includes(h));

    if (removedHours.length > 0) {
      const appts = this.getAppointments();
      appts.forEach(a => {
        if (a.barberId === barberId && a.date === date && removedHours.includes(a.time) && (a.status === 'confirmed' || a.status === 'pending')) {
          this.updateAppointmentStatus(a.id, 'cancelled', cancellationReason || 'Indisponibilidade do barbeiro.');
        }
      });
    }

    all[barberId].dates[date] = sortedHours;
    localStorage.setItem(KEYS.BARBER_SETTINGS, JSON.stringify(all));
  }

  getAvailableSlots(barberId: string, date: string): string[] {
    const configHours = this.getBarberHoursForDate(barberId, date);
    const occupied = this.getAppointments()
      .filter(a => a.barberId === barberId && a.date === date && (a.status === 'confirmed' || a.status === 'pending'))
      .map(a => a.time);
    
    return configHours.filter(h => !occupied.includes(h)).sort((a, b) => a.localeCompare(b));
  }

  addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const notifications = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    notifications.push({
      ...notif,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false
    });
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }

  getNotifications(userId: string): Notification[] {
    return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]')
      .filter((n: any) => n.userId === userId)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  markNotificationAsRead(id: string): void {
    const notifications = JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS) || '[]');
    const updated = notifications.map((n: any) => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  getUnreadNotificationsCount(userId: string): number {
    return this.getNotifications(userId).filter(n => !n.read).length;
  }

  getMessages(): Message[] { return JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]'); }
  getUnreadMessagesCount(userId: string): number {
    return this.getMessages().filter(m => m.receiverId === userId && !m.read).length;
  }
  
  getConversations(userId: string): { user: User, lastMessage: Message }[] {
    const allMessages = this.getMessages();
    const conversationsMap = new Map<string, Message>();
    allMessages.filter(m => m.senderId === userId || m.receiverId === userId).forEach(m => {
      const otherId = m.senderId === userId ? m.receiverId : m.senderId;
      const current = conversationsMap.get(otherId);
      if (!current || new Date(m.timestamp) > new Date(current.timestamp)) conversationsMap.set(otherId, m);
    });
    const users = this.getUsers();
    return Array.from(conversationsMap.entries()).map(([id, msg]) => ({
      user: users.find(u => u.id === id)!,
      lastMessage: msg
    })).filter(c => c.user);
  }

  sendMessage(msg: Omit<Message, 'id' | 'timestamp' | 'read'>): void {
    const messages = this.getMessages();
    messages.push({ ...msg, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false });
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(messages));
  }

  markMessagesAsRead(userId: string, otherId: string): void {
    const messages = this.getMessages();
    const updated = messages.map(m => (m.receiverId === userId && m.senderId === otherId) ? { ...m, read: true } : m);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(updated));
  }

  getServices() { return INITIAL_SERVICES; }
  
  // REVIEWS SYSTEM
  getReviews(): Review[] { return JSON.parse(localStorage.getItem(KEYS.REVIEWS) || '[]'); }
  
  getReviewsByBarber(barberId: string): Review[] {
    return this.getReviews()
      .filter(r => r.barberId === barberId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getReviewByAppointment(appointmentId: string): Review | undefined {
    return this.getReviews().find(r => r.appointmentId === appointmentId);
  }

  addReview(review: Review): void {
    const reviews = this.getReviews();
    reviews.push(review);
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));

    // Notificar o Barbeiro
    const barber = this.getBarbers().find(b => b.id === review.barberId);
    if (barber && barber.userId) {
      this.addNotification({
        userId: barber.userId,
        title: 'Nova Avaliação ⭐',
        message: `${review.userName} avaliou seu serviço com ${review.rating} estrelas.`,
        type: 'system',
        link: `/appointment/${review.appointmentId}`
      });
    }
  }

  getBarbers(): Barber[] { 
    // Calcula dinamicamente o rating baseado nos reviews armazenados + rating inicial
    const reviews = this.getReviews();
    
    return INITIAL_BARBERS.map(barber => {
      const barberReviews = reviews.filter(r => r.barberId === barber.id);
      if (barberReviews.length === 0) return { ...barber, reviewsCount: 0 };
      
      const sum = barberReviews.reduce((acc, curr) => acc + curr.rating, 0);
      // Média ponderada simples: (Nota Inicial * 5 + Soma Reviews) / (5 + Qtd Reviews)
      // Isso dá um "peso" à nota inicial para ela não mudar drasticamente com 1 review
      const weightedSum = (barber.rating * 5) + sum;
      const totalCount = 5 + barberReviews.length;
      const dynamicRating = parseFloat((weightedSum / totalCount).toFixed(1));

      return {
        ...barber,
        rating: dynamicRating,
        reviewsCount: barberReviews.length
      };
    });
  }

  findUserByEmail(email: string): User | undefined { return this.getUsers().find(u => u.email === email); }
  saveUser(user: User): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }
  deleteUser(id: string): void {
    const users = this.getUsers().filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }
  saveBarberSettings(barberId: string, settings: any): void {
    const all = JSON.parse(localStorage.getItem(KEYS.BARBER_SETTINGS) || '{}');
    all[barberId] = settings;
    localStorage.setItem(KEYS.BARBER_SETTINGS, JSON.stringify(all));
  }
}

export const db = new DatabaseService();