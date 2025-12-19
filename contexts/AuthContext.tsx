import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () => {
    const storedUser = localStorage.getItem('pb_current_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const freshUser = db.getUsers().find(u => u.id === parsedUser.id);
      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem('pb_current_user', JSON.stringify(freshUser));
      }
    }
  };

  useEffect(() => {
    // Verificar sessão ao carregar
    const storedUser = localStorage.getItem('pb_current_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      const freshUser = db.getUsers().find(u => u.id === parsedUser.id);
      setUser(freshUser || parsedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const foundUser = db.findUserByEmail(email);
    if (foundUser && foundUser.password === password) {
      setUser(foundUser);
      localStorage.setItem('pb_current_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string) => {
    if (db.findUserByEmail(email)) return false;

    // Added missing 'role' property to comply with User interface
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      password,
      loyaltyStamps: 0,
      role: 'customer',
      isAdmin: false
    };

    db.saveUser(newUser);
    setUser(newUser);
    localStorage.setItem('pb_current_user', JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pb_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};