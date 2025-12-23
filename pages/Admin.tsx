
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, DollarSign, TrendingUp, Check, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Appointment, Service } from '../types';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [revenue, setRevenue] = useState(0);

  // Redirecionar se não for admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  const loadData = async () => {
    const all = await api.getAppointments();
    // Ordenar: Pendentes primeiro
    all.sort((a, b) => (a.status === 'pending' ? -1 : 1));
    setAppointments(all);

    const srvs = await api.getServices();
    setServices(srvs);

    // Calcular receita (simulada baseada em serviços completados ou confirmados)
    const total = all
      .filter(a => a.status === 'completed' || a.status === 'confirmed')
      .reduce((acc, curr) => {
        const service = srvs.find(s => s.id === curr.serviceId);
        return acc + (service?.price || 0);
      }, 0);
    setRevenue(total);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    await api.updateAppointmentStatus(id, newStatus);
    loadData(); // Recarregar dados
  };

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name || 'Serviço';

  // Mock Data para Gráfico
  const chartData = [
    { name: 'Seg', revenue: 400 },
    { name: 'Ter', revenue: 300 },
    { name: 'Qua', revenue: 550 },
    { name: 'Qui', revenue: 450 },
    { name: 'Sex', revenue: 890 },
    { name: 'Sáb', revenue: 980 },
    { name: 'Dom', revenue: 200 },
  ];

  const StatCard = ({ title, value, icon: Icon, trend }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 bg-zinc-800 rounded-lg text-gold-500">
          <Icon size={20} />
        </div>
        <span className="text-green-500 text-xs flex items-center bg-green-900/20 px-1.5 py-0.5 rounded">
          <TrendingUp size={12} className="mr-1" /> {trend}
        </span>
      </div>
      <h3 className="text-zinc-400 text-xs uppercase tracking-wider">{title}</h3>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );

  if (!user?.isAdmin) return null;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-serif text-white">Dashboard</h2>
        <span className="text-xs text-gold-500 bg-gold-900/10 px-3 py-1 rounded-full border border-gold-500/20 flex items-center gap-1">
          <ShieldAlert size={12}/> Admin
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Receita Estimada" value={`R$ ${revenue}`} icon={DollarSign} trend="Hoje" />
        <StatCard title="Agendamentos" value={appointments.length} icon={Calendar} trend="Total" />
      </div>

      {/* Financial Chart */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
        <h3 className="text-white font-medium mb-4">Receita Semanal</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                cursor={{fill: '#27272a'}}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.revenue > 800 ? '#D4AF37' : '#52525b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointments Management */}
      <div>
        <h3 className="text-white font-medium mb-3">Gerenciar Agendamentos</h3>
        {appointments.length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhum agendamento registrado.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => (
              <div key={apt.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{apt.customerName}</h4>
                    <p className="text-zinc-400 text-xs">{getServiceName(apt.serviceId)} • {apt.time}</p>
                    <p className={`text-[10px] mt-1 uppercase font-bold ${
                      apt.status === 'pending' ? 'text-yellow-500' : 
                      apt.status === 'confirmed' ? 'text-blue-500' : 
                      apt.status === 'completed' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {apt.status === 'pending' ? 'Aguardando Aprovação' : apt.status}
                    </p>
                  </div>
                </div>
                
                {apt.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-zinc-800/50">
                    <button 
                      onClick={() => handleStatusChange(apt.id, 'cancelled')}
                      className="flex-1 py-2 rounded bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Recusar
                    </button>
                    <button 
                      onClick={() => handleStatusChange(apt.id, 'confirmed')}
                      className="flex-1 py-2 rounded bg-green-900/20 text-green-500 border border-green-900/50 hover:bg-green-900/40 text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Check size={14} /> Aprovar
                    </button>
                  </div>
                )}

                {apt.status === 'confirmed' && (
                  <button 
                      onClick={() => handleStatusChange(apt.id, 'completed')}
                      className="w-full py-2 rounded bg-gold-500/20 text-gold-500 border border-gold-500/50 hover:bg-gold-500/40 text-xs font-bold"
                  >
                    Concluir Serviço (Dar Selo)
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
