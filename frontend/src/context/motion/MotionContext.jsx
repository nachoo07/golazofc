import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import client from '../../api/axios';
import { LoginContext } from '../login/LoginContext';
import { showConfirmAlert, showErrorAlert, showSuccessToast } from '../../utils/alerts/Alerts';

export const MotionContext = createContext();

export const MotionProvider = ({ children }) => {
  const [motions, setMotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { auth } = useContext(LoginContext); // Añadimos waitForAuth

  const fetchMotions = useCallback(async () => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await client.get('/motions/');
      const data = Array.isArray(response.data) ? response.data : [];
      setMotions(data);
      return data;
    } catch (error) {
      console.error('Error fetching motions:', error);
      if (error.response?.status === 401) {
        // Token expirado, no mostrar alerta en login
      } else {
        showErrorAlert('¡Error!', 'No se pudieron obtener los movimientos.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const createMotion = useCallback(async (motion) => {
    if (auth !== 'admin') return null;
    try {
      const response = await client.post('/motions/create', motion);
      const newMotion = response.data;
      setMotions((prev) => {
        if (prev.some((m) => m._id === newMotion._id)) {
          return prev;
        }
        return [...prev, newMotion];
      });
      showSuccessToast('¡Éxito!', 'El movimiento ha sido creado correctamente');
      return newMotion;
    } catch (error) {
      console.error('Error creating motion:', error);
      showErrorAlert('¡Error!', 'Ha ocurrido un error al crear el movimiento');
      throw error;
    }
  }, [auth]);

  const updateMotion = useCallback(async (id, updatedMotion) => {
    if (auth !== 'admin') return null;
    try {
      const response = await client.put(`/motions/update/${id}`, updatedMotion);
      const updated = response.data;
      setMotions((prev) => prev.map((motion) => (motion._id === id ? updated : motion)));
      showSuccessToast('¡Éxito!', 'El movimiento ha sido actualizado correctamente');
      return updated;
    } catch (error) {
      console.error('Error updating motion:', error);
      showErrorAlert('¡Error!', 'Ha ocurrido un error al actualizar el movimiento');
      throw error;
    }
  }, [auth]);

  const deleteMotion = useCallback(async (id) => {
    if (auth !== 'admin') return;
    try {
      const confirmacion = await showConfirmAlert(
        '¿Estás seguro que deseas eliminar el movimiento?',
        'Esta acción no se puede deshacer'
      );
      if (confirmacion) {
        await client.delete(`/motions/delete/${id}`);
        setMotions((prev) => prev.filter((motion) => motion._id !== id));
        showSuccessToast('¡Eliminado!', 'El movimiento ha sido eliminado correctamente');
      }
    } catch (error) {
      console.error('Error deleting motion:', error);
      showErrorAlert('¡Error!', 'Ha ocurrido un error al eliminar el movimiento');
      throw error;
    }
  }, [auth]);

  const getMotionsByDate = useCallback(async (date) => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await client.get(`/motions/date/${date}`);
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    } catch (error) {
      console.error('Error obteniendo movimientos por fecha:', error);
      if (error.response?.status !== 401) {
        showErrorAlert('¡Error!', 'No se pudieron obtener los movimientos por fecha.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const getMotionsByDateRange = useCallback(async (startDate, endDate) => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await client.get(
        `/motions/date-range?startDate=${startDate}&endDate=${endDate}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    } catch (error) {
      console.error('Error obteniendo movimientos por rango de fechas:', error);
      if (error.response?.status !== 401) {
        showErrorAlert('¡Error!', 'No se pudieron obtener los movimientos por rango de fechas.');
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  // Carga inicial de movimientos
  useEffect(() => {
    const fetchData = async () => {
      if (auth === 'admin') {
        await fetchMotions();
      } else {
        setMotions([]);
      }
    };
    fetchData();
  }, [auth, fetchMotions]);

  return (
    <MotionContext.Provider
      value={{
        motions,
        loading,
        fetchMotions,
        createMotion,
        updateMotion,
        deleteMotion,
        getMotionsByDate,
        getMotionsByDateRange,
      }}
    >
      {children}
    </MotionContext.Provider>
  );
};
