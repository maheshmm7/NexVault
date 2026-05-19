import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useSettings } from './SettingsContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authenticated' | 'reconnecting' | 'unauthenticated'
  const { triggerSync } = useSettings();

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      const isAuth = localStorage.getItem('isAuthenticated');
      if (!isAuth) {
        if (active) {
          setAuthState('unauthenticated');
        }
        return;
      }
      try {
        const response = await api.get('/users/me');
        if (active) {
          setUser(response.data);
          try {
            await triggerSync();
          } catch (syncError) {
            console.warn("Failed to sync settings during initAuth:", syncError);
          }
          setAuthState('authenticated');
        }
      } catch (error) {
        if (!active) return;
        const isAuthError = error.response && (error.response.status === 401 || error.response.status === 403);
        if (isAuthError) {
          localStorage.removeItem('isAuthenticated');
          setUser(null);
          setAuthState('unauthenticated');
        } else {
          console.warn("Auth initialization temporary connection failure (preserving hydration state):", error);
          setAuthState('reconnecting');
          setTimeout(() => {
            if (active) initAuth();
          }, 3000);
        }
      }
    };
    initAuth();
    return () => {
      active = false;
    };
  }, [triggerSync]);

  const login = async (email, password) => {
    setAuthState('loading');
    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2 expects username
      formData.append('password', password);

      await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('isAuthenticated', 'true');
      
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      try {
        await triggerSync();
      } catch (syncError) {
        console.warn("Failed to sync settings upon login:", syncError);
      }
      setAuthState('authenticated');
    } catch (err) {
      setAuthState('unauthenticated');
      throw err;
    }
  };

  const signup = async (email, password, fullName) => {
    setAuthState('loading');
    try {
      const res = await api.post('/users/signup', {
        email,
        password,
        full_name: fullName,
        display_name: fullName,
        avatar_url: null
      });
      await login(email, password);
      return res.data;
    } catch (err) {
      setAuthState('unauthenticated');
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
      localStorage.removeItem('isAuthenticated');
      setUser(null);
      setAuthState('unauthenticated');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/users/me');
      setUser(response.data);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const loading = authState === 'loading' || authState === 'reconnecting';

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateProfile, refreshUser, loading, authState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
