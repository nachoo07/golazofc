import axios from 'axios';

// Asegúrate de que esto coincida con tu backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005/api';

const client = axios.create({
  baseURL: API_URL,
  withCredentials: true, // ¡CRUCIAL! Esto permite que el navegador envíe y reciba las Cookies HttpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- VARIABLES DE CONTROL (Mutex para Refresh) ---
let isRefreshing = false;
let failedQueue = [];
let refreshPromise = null;

// Procesar cola
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = client.post('/auth/refresh').finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

// --- INTERCEPTOR DE RESPUESTAS ---
client.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // CASO A: Request cancelada
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    // CASO B: Error de Red / Sin respuesta
    if (error.code === 'ERR_NETWORK' || !error.response) {
      const networkError = new Error('Sin conexión a internet.');
      networkError.code = error.code || 'ERR_NETWORK';
      networkError.cause = error;
      return Promise.reject(networkError);
    }

    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/logout');

    // No intentar refresh sobre endpoints de auth para evitar bucles y errores cruzados.
    if (isAuthEndpoint) {
      // Si falla el refresh, no hay nada más que hacer.
      return Promise.reject(error);
    }

    // CASO B: Token Expirado (401)
    if (error.response.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        // Si ya estamos refrescando, poner en cola
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Cuando se resuelva, reintentamos la petición original
            return client(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Llamamos al endpoint de refresh.
        // Al usar credentials: true, envía la cookie refreshToken y el backend responde con nuevas cookies set-cookie.
        await refreshSession();

        // Procesamos la cola con éxito
        processQueue(null);
        isRefreshing = false;

        // Reintentamos la petición original (ahora el navegador enviará la cookie nueva)
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Disparamos evento para que React sepa que debe hacer logout visualmente
        window.dispatchEvent(new CustomEvent('SESSION_EXPIRED'));

        return Promise.reject(refreshError);
      }
    }
    // Cualquier otro error
    return Promise.reject(error);
  }
);

export default client;
