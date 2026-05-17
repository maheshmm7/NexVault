import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from './SettingsContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { triggerSync } = useSettings();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
      } catch (error) {
        if (error.response && error.response.status !== 401) {
          console.error("Auth initialization failed", error);
        }
        // If token is invalid or expired, clean it up
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects username
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = response.data.access_token;
      if (token) {
        localStorage.setItem('token', token);
      }
      
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      await triggerSync(); // Immediately sync user settings upon login!
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, fullName) => {
    setLoading(true);
    try {
      await api.post('/users/signup', {
        email,
        password,
        full_name: fullName,
        display_name: fullName,
        avatar_url: null
      });
      await login(email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const updateProfile = async (data) => {
    const response = await api.put('/users/me', data);
    setUser(response.data);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Session termination failed on server", error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
