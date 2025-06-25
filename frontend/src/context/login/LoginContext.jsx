import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const LoginContext = createContext();

export const LoginProvider = ({ children }) => {
  const [auth, setAuth] = useState(localStorage.getItem('authRole') || null);
  const [userData, setUserData] = useState(
    localStorage.getItem('authName') ? { name: localStorage.getItem('authName') } : null
  );
  const [loading, setLoading] = useState(true); // Siempre inicia con loading true
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authReady, setAuthReady] = useState(false); // Nuevo estado para indicar que la autenticación está lista
  const navigate = useNavigate();

  // Promesa para esperar a que la autenticación esté lista
  let authPromiseResolve;
  const authPromise = new Promise((resolve) => {
    authPromiseResolve = resolve;
  });

  // Verificar autenticación al montar el componente
  const checkAuth = async () => {
    const authRole = localStorage.getItem('authRole');
    const authName = localStorage.getItem('authName');

    if (!authRole || !authName) {
      setAuth(null);
      setUserData(null);
      setLoading(false);
      setAuthReady(true);
      authPromiseResolve();
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }

    try {
      setLoading(true);
      await axios.post('/api/auth/refresh', {}, { withCredentials: true });
      setAuth(authRole);
      setUserData({ name: authName });
    } catch (error) {
      console.error('Error al verificar autenticación:', error.response?.data || error.message);
      setAuth(null);
      setUserData(null);
      localStorage.removeItem('authRole');
      localStorage.removeItem('authName');
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
      setAuthReady(true);
      authPromiseResolve();
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (mail, password) => {
    try {
      const response = await axios.post(
        '/api/auth/login',
        { mail, password },
        { withCredentials: true }
      );
      const { role, name } = response.data.user;
      setAuth(role);
      setUserData({ name });
      localStorage.setItem('authRole', role);
      localStorage.setItem('authName', name);
      setIsLoggingOut(false);
      navigate(role === 'admin' ? '/home' : '/homeuser', { replace: true });
      return role;
    } catch (error) {
      console.error('Error en login:', error.response?.data || error.message);
      throw error.response?.data?.message || 'Error al iniciar sesión';
    }
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      setAuth(null);
      setUserData(null);
      localStorage.removeItem('authRole');
      localStorage.removeItem('authName');
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      await axios.post('/api/auth/refresh', {}, { withCredentials: true });
    } catch (error) {
      console.error('Error al renovar token:', error.response?.data || error.message);
      logout();
      throw error;
    }
  };

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (isLoggingOut || !auth || error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }
        if (originalRequest.url.includes('/api/auth/refresh')) {
          logout();
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        try {
          await refreshAccessToken();
          return axios(originalRequest);
        } catch (refreshError) {
          console.error('Error al renovar token:', refreshError.response?.data || refreshError.message);
          logout();
          return Promise.reject(refreshError);
        }
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [auth, isLoggingOut]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (auth && !isLoggingOut) {
        refreshAccessToken();
      }
    }, 20 * 60 * 1000); // 20 minutos
    return () => clearInterval(interval);
  }, [auth, isLoggingOut]);

  return (
    <LoginContext.Provider value={{ auth, userData, login, logout, loading, authReady, waitForAuth: () => authPromise }}>
      {children}
    </LoginContext.Provider>
  );
};