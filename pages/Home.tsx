
import React, { useState, useEffect } from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate, useLocation } = ReactRouterDOM;
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import { LoyaltyCard } from '../components/LoyaltyCard';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Appointment, Service, Barber } from '../types';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  useEffect(() => {
    if (user) {
        // Carrega dados para o card de histórico
        const fetchData = async () => {
            const allAppts = await api.getAppointments();
            setAppointments(allAppts.filter(a => a.userId === user.id));
            
            const allServices = await api.getServices();
            setServices(allServices);

            const allBarbers = await api.getBarbers();
            setBarbers(allBarbers);
        };
        fetchData();
    }
  }, [user]);

  const handleBookingClick = () => {
    if (user) {
      navigate('/book');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden min-h-[240px] flex items-center justify-center border border-zinc-200 dark:border-zinc-800 shadow-xl">
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" 
          alt="Barbershop Interior" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-100 dark:from-charcoal-950 via-transparent to-transparent"></div>
        
        <div className="relative z-10 text-center space-y-3 px-4">
          <p className="text-gold-600 dark:text-gold-500 text-[10px] font-black tracking-[0.3em] uppercase">Est. 2020 • Peaky Blinders</p>
          <h2 className="text-4xl md:text-5xl font-serif text-zinc-900 dark:text-white font-bold leading-tight">
            Visual Afiado <br/> <span className="italic text-zinc-500 dark:text-zinc-400 text-2xl md:text-3xl font-normal">para Mentes Afiadas</span>
          </h2>
          <button 
            onClick={handleBookingClick}
            className="mt-6 bg-gold-600 dark:bg-gold-500 hover:bg-gold-500 dark:hover:bg-gold-400 text-white dark:text-black px-10 py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all shadow-xl active:scale-95"
          >
            {user ? 'AGENDAR HORÁRIO' : 'ENTRAR PARA AGENDAR'}
          </button>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-sm">
          <div className="w-10 h-10 bg-gold-600/10 dark:bg-gold-500/10 rounded-full flex items-center justify-center mb-3">
            <Clock className="text-gold-600 dark:text-gold-500" size={20} />
          </div>
          <h4 className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Aberto Hoje</h4>
          <p className="text-sm font-bold mt-1">08:00 — 18:00</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-sm">
          <div className="w-10 h-10 bg-gold-600/10 dark:bg-gold-500/10 rounded-full flex items-center justify-center mb-3">
            <MapPin className="text-gold-600 dark:text-gold-500" size={20} />
          </div>
          <h4 className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Localização</h4>
          <p className="text-sm font-bold mt-1">R. Salvador Pires de Lima, 553 - Sacomã</p>
        </div>
      </div>

      {/* Loyalty Status (Visible for all logged users) */}
      {user && (
        <section className="animate-slide-up">
          <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="font-serif text-2xl text-zinc-900 dark:text-white font-bold">Seu Status</h3>
            <button onClick={() => navigate('/profile')} className="text-gold-600 dark:text-gold-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
              Detalhes <ChevronRight size={14} />
            </button>
          </div>
          <LoyaltyCard 
             appointments={appointments}
             services={services}
             barbers={barbers}
          />
        </section>
      )}

      {/* Featured Styles Section */}
      <section className="pb-10">
        <h3 className="font-serif text-2xl text-zinc-900 dark:text-white mb-6 font-bold px-1">Cortes em Destaque</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden group shadow-lg">
            <img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?q=80&w=2070&auto=format&fit=crop" className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt="Cut 1" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex items-end">
                <span className="text-white text-xs font-black uppercase tracking-widest">Corte Normal</span>
            </div>
          </div>
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden group shadow-lg">
            <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1888&auto=format&fit=crop" className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" alt="Cut 2" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex items-end">
                <span className="text-white text-xs font-black uppercase tracking-widest">Corte Navalhado</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
