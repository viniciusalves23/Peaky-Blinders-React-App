
export interface Service {
  id: string;
  name: string;
  duration: number; // minutos
  price: number;
  description: string;
}

// Unified User/Profile Type
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'barber' | 'admin';
  loyaltyStamps: number;
  avatarUrl?: string;
  isAdmin?: boolean;
  
  // Barber specific fields (optional on the User type)
  specialty?: string;
  portfolio?: string[];
  rating?: number;
  bio?: string;
}

// For UI compatibility, Barber type is just a User with role='barber'
export type Barber = User;

export interface Appointment {
  id: string;
  serviceId: string;
  barberId: string; // References Profile ID
  date: string; 
  time: string; 
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  userId: string;
  customerName: string;
  createdAt: string;
  refusalReason?: string;
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
