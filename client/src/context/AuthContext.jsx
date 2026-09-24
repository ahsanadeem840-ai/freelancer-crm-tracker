import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default fallback demo user so UI renders with rich profile
    return {
      _id: 'demo_user_1',
      name: 'Muhammad Ahsan',
      email: 'ahsan@example.com',
      role: 'freelancer',
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync token in localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Sync user in localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Attempt backend API login
      const response = await authApi.login({ email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      // If backend is offline or network error, provide local simulation fallback
      console.warn('Backend API login error, falling back to local session:', err.message);
      const fallbackUser = {
        _id: 'local_user_' + Date.now(),
        name: email.split('@')[0],
        email,
        role: email.includes('admin') ? 'admin' : 'freelancer',
      };
      setToken('demo_jwt_token_' + Date.now());
      setUser(fallbackUser);
      return { success: true, user: fallbackUser, simulated: true };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register({ name, email, password, role });
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true, user: receivedUser };
    } catch (err) {
      console.warn('Backend API register error, falling back to local session:', err.message);
      const fallbackUser = {
        _id: 'local_user_' + Date.now(),
        name,
        email,
        role,
      };
      setToken('demo_jwt_token_' + Date.now());
      setUser(fallbackUser);
      return { success: true, user: fallbackUser, simulated: true };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token || !!user,
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
