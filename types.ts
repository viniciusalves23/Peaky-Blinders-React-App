
export interface Service {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;
  description: string;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  portfolio: string[];
  rating: number;
  userId?: string; 
  reviewsCount?: number;
}

export interface Appointment {
  id: string;
  serviceId: string;
  barberId: string;
  date: string; 
  time: string; 
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  userId: string;
  customerName: string;
  createdAt: string;
  refusalReason?: string;
}

export type UserRole = 'customer' | 'barber' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  loyaltyStamps: number;
  role: UserRole;
  isAdmin: boolean;
  phone?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'appointment' | 'system';
  link: string;
  read: boolean;
  timestamp: string;
}

export interface Review {
  id: string;
  appointmentId: string;
  barberId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}