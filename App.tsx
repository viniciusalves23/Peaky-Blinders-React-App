
import React from 'react';
// Using namespace import to resolve "no exported member" errors in certain environments
import * as ReactRouterDOM from 'react-router-dom';
const { HashRouter, Routes, Route, Navigate } = ReactRouterDOM;
import { Layout } from './components/Layout';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Home } from './pages/Home';
import { Booking } from './pages/Booking';
import { Portfolio } from './pages/Portfolio';
import { Profile } from './pages/Profile';
import { AdminManager } from './pages/AdminManager';
import { BarberDashboard } from './pages/BarberDashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { UpdatePassword } from './pages/UpdatePassword';
import { Chat } from './pages/Chat';
import { MessagesList } from './pages/MessagesList';
import { Notifications } from './pages/Notifications';
import { AppointmentDetails } from './pages/AppointmentDetails';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/book" element={<Booking />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminManager />} />
              <Route path="/barber" element={<BarberDashboard />} />
              <Route path="/messages" element={<MessagesList />} />
              <Route path="/chat/:recipientId" element={<Chat />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/appointment/:id" element={<AppointmentDetails />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
