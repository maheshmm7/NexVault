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
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
      } catch (error) {
        // Safe check: 401 means no active session cookie, which is normal for unauth users
        if (error.response && error.response.status !== 401) {
          console.error("Auth initialization failed", error);
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects username
    formData.append('password', password);

    await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    // Cookie is set automatically in HTTPOnly storage by browser
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
    await triggerSync(); // Immediately sync user settings upon login!
  };

  const signup = async (email, password, fullName) => {
    await api.post('/users/signup', {
      email,
      password,
      full_name: fullName,
      display_name: fullName,
      avatar_url: null
    });
    await login(email, password);
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
