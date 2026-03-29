import { createContext, useState, useEffect, useCallback } from 'react';
import client, { refreshSession } from '../../api/axios';
import { useNavigate } from 'react-router-dom';

export const LoginContext = createContext();

export const LoginProvider = ({ children }) => {
  const [auth, setAuth] = useState(localStorage.getItem('authRole') || null);
  const [userData, setUserData] = useState(() =>
    localStorage.getItem('authName')
      ? {
        id: localStorage.getItem('authUserId') || null,
        name: localStorage.getItem('authName'),
        mail: localStorage.getItem('authMail') || null,
      }
      : null
  );

  const [loading, setLoading] = useState(true); // Siempre inicia con loading true
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [authReady, setAuthReady] = useState(false); // Nuevo estado para indicar que la autenticación está lista

  const navigate = useNavigate();

  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem('authRole');
    localStorage.removeItem('authName');
    localStorage.removeItem('authMail');
    localStorage.removeItem('authUserId');
  }, []);

  const persistStoredAuth = useCallback((role, nextUserData) => {
    localStorage.setItem('authRole', role);
    localStorage.setItem('authName', nextUserData.name);

    if (nextUserData.mail) localStorage.setItem('authMail', nextUserData.mail);
    else localStorage.removeItem('authMail');

    if (nextUserData.id) localStorage.setItem('authUserId', nextUserData.id);
    else localStorage.removeItem('authUserId');
  }, []);

  const clearAuthState = useCallback(() => {
    setAuth(null);
    setUserData(null);
    clearStoredAuth();
  }, [clearStoredAuth]);

  const handleSessionExpired = useCallback(() => {
    clearAuthState();
    if (window.location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [clearAuthState, navigate]);

  const checkAuth = useCallback(async () => {
    if (isOffline) {
      setLoading(false);
      setAuthReady(true);
      return;
    }

    const storedRole = localStorage.getItem('authRole');
    const storedName = localStorage.getItem('authName');
    const storedMail = localStorage.getItem('authMail');
    const storedId = localStorage.getItem('authUserId');

    try {
      setLoading(true);
      const response = await refreshSession();
      const refreshedUser = response?.data?.user;

      if (refreshedUser?.role && refreshedUser?.name) {
        const nextUserData = {
          id: refreshedUser.id || refreshedUser._id || null,
          name: refreshedUser.name,
          mail: refreshedUser.mail || null,
        };

        setAuth(refreshedUser.role);
        setUserData(nextUserData);
        persistStoredAuth(refreshedUser.role, nextUserData);
        return;
      }

      if (storedRole && storedName) {
        setAuth(storedRole);
        setUserData({ id: storedId || null, name: storedName, mail: storedMail || null });
        return;
      }

      handleSessionExpired();
    } catch {
      handleSessionExpired();
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }, [handleSessionExpired, isOffline, persistStoredAuth]);

  const login = async (mail, password) => {
    if (isOffline) throw new Error('Sin conexión.');

    try {
      // El client gestiona las cookies automáticamente
      const response = await client.post('/auth/login', { mail, password });
      const payload = response?.data?.user ?? response?.data ?? {};
      const role = payload.role || null;
      const name = payload.name || null;
      const userMail = payload.mail || null;
      const id = payload.id || payload._id || null;

      if (!role || !name) {
        throw new Error('Respuesta de login inválida');
      }

      const nextUserData = { id, name, mail: userMail };

      setAuth(role);
      setUserData(nextUserData);
      persistStoredAuth(role, nextUserData);

      navigate(role === 'admin' ? '/' : '/homeuser', { replace: true });
      return role;
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al iniciar sesión';
      throw new Error(msg);
    }
  };

  const logout = useCallback(async (callBackend = true) => {
    clearAuthState();

    if (callBackend && !isOffline) {
      try {
        await client.post('/auth/logout');
      } catch (error) {
        console.error('Error silencioso en logout:', error);
      }
    }

    navigate('/login', { replace: true });
  }, [clearAuthState, isOffline, navigate]);


  useEffect(() => {
    checkAuth();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkAuth]);

  useEffect(() => {
    window.addEventListener('SESSION_EXPIRED', handleSessionExpired);

    return () => {
      window.removeEventListener('SESSION_EXPIRED', handleSessionExpired);
    };
  }, [handleSessionExpired]);

  return (
    <LoginContext.Provider value={{
      auth,
      userData,
      login,
      logout,
      loading,
      authReady,
      isOffline
    }}>
      {children}
    </LoginContext.Provider>
  );
};
