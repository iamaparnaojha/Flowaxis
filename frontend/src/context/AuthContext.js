'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, userApi, setAccessToken, clearAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // True during initial silent refresh

  /**
   * Aparna: On every app mount (including page refresh), we attempt a silent refresh.
   * The httpOnly cookie is sent automatically by the browser — if it's still valid,
   * we get a new access token back and populate the in-memory store.
   * This is what makes the "memory token" approach feel seamless to the user.
   */
  const silentRefresh = useCallback(async () => {
    try {
      const { data } = await authApi.refresh();
      setAccessToken(data.data.accessToken);

      const { data: meData } = await userApi.getMe();
      setCurrentUser(meData.data.user);
    } catch {
      // No valid refresh token — user needs to log in
      clearAccessToken();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    setAccessToken(data.data.accessToken);
    setCurrentUser(data.data.user);
    return data.data.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setCurrentUser(null);
    }
  };

  const register = async (payload) => {
    const { data } = await authApi.register(payload);
    return data;
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, register, silentRefresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
};
