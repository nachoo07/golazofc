import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LoginContext } from '../login/LoginContext';

export const MotionContext = createContext();

export const MotionProvider = ({ children }) => {
  const [motions, setMotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const { auth, waitForAuth } = useContext(LoginContext); // Añadimos waitForAuth

  const fetchMotions = useCallback(async () => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await axios.get('/api/motions/', { withCredentials: true });
      const data = Array.isArray(response.data) ? response.data : [];
      setMotions(data);
      return data;
    } catch (error) {
      console.error('Error fetching motions:', error);
      Swal.fire('¡Error!', 'No se pudieron obtener los movimientos.', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const createMotion = useCallback(async (motion) => {
    if (auth !== 'admin') return null;
    try {
      const response = await axios.post('/api/motions/create', motion, { withCredentials: true });
      const newMotion = response.data;
      setMotions((prev) => {
        if (prev.some((m) => m._id === newMotion._id)) {
          return prev;
        }
        return [...prev, newMotion];
      });
      Swal.fire('¡Éxito!', 'El movimiento ha sido creado correctamente', 'success');
      return newMotion;
    } catch (error) {
      console.error('Error creating motion:', error);
      Swal.fire('¡Error!', 'Ha ocurrido un error al crear el movimiento', 'error');
      throw error;
    }
  }, [auth]);

  const updateMotion = useCallback(async (id, updatedMotion) => {
    if (auth !== 'admin') return null;
    try {
      const response = await axios.put(`/api/motions/update/${id}`, updatedMotion, { withCredentials: true });
      const updated = response.data;
      setMotions((prev) => prev.map((motion) => (motion._id === id ? updated : motion)));
      Swal.fire('¡Éxito!', 'El movimiento ha sido actualizado correctamente', 'success');
      return updated;
    } catch (error) {
      console.error('Error updating motion:', error);
      Swal.fire('¡Error!', 'Ha ocurrido un error al actualizar el movimiento', 'error');
      throw error;
    }
  }, [auth]);

  const deleteMotion = useCallback(async (id) => {
    if (auth !== 'admin') return;
    try {
      const confirmacion = await Swal.fire({
        title: '¿Estás seguro que deseas eliminar el movimiento?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      });
      if (confirmacion.isConfirmed) {
        await axios.delete(`/api/motions/delete/${id}`, { withCredentials: true });
        setMotions((prev) => prev.filter((motion) => motion._id !== id));
        Swal.fire('¡Eliminado!', 'El movimiento ha sido eliminado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error deleting motion:', error);
      Swal.fire('¡Error!', 'Ha ocurrido un error al eliminar el movimiento', 'error');
      throw error;
    }
  }, [auth]);

  const getMotionsByDate = useCallback(async (date) => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await axios.get(`/api/motions/date/${date}`, { withCredentials: true });
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    } catch (error) {
      console.error('Error obteniendo movimientos por fecha:', error);
      Swal.fire('¡Error!', 'No se pudieron obtener los movimientos por fecha.', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const getMotionsByDateRange = useCallback(async (startDate, endDate) => {
    if (auth !== 'admin') return [];
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/motions/date-range?startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      return data;
    } catch (error) {
      console.error('Error obteniendo movimientos por rango de fechas:', error);
      Swal.fire('¡Error!', 'No se pudieron obtener los movimientos por rango de fechas.', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [auth]);

  // Carga inicial de movimientos
  useEffect(() => {
    const fetchData = async () => {
      await waitForAuth(); // Espera a que la autenticación esté lista
      if (auth === 'admin') {
        await fetchMotions();
      } else {
        setMotions([]);
      }
    };
    fetchData();
  }, [auth, fetchMotions, waitForAuth]); // Añadimos waitForAuth como dependencia

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