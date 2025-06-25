import { createContext, useState, useEffect, useContext } from 'react';
import { LoginContext } from '../login/LoginContext';
import Swal from 'sweetalert2';
import axios from 'axios';

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const [asistencias, setAttendance] = useState([]);
  const { auth, waitForAuth } = useContext(LoginContext); // Añadimos waitForAuth

  // Carga asistencias solo cuando auth cambia y es válido
  useEffect(() => {
    const fetchData = async () => {
      await waitForAuth(); // Espera a que la autenticación esté lista
      if (auth === 'admin' || auth === 'user') {
        await ObtenerAsistencia();
      }
    };
    fetchData();
  }, [auth, waitForAuth]); // Añadimos waitForAuth como dependencia

  const ObtenerAsistencia = async () => {
    try {
      const response = await axios.get('/api/attendance/', {
        withCredentials: true,
      });
      // Asegurarse de que response.data sea un arreglo
      const data = Array.isArray(response.data) ? response.data : [];
      setAttendance(data);
    } catch (error) {
      console.error('Error al cargar las asistencias', error);
      setAttendance([]); // En caso de error, establecer asistencias como un arreglo vacío
    }
  };

  const agregarAsistencia = async (asistencia) => {
    if (auth === 'admin' || auth === 'user') {
      try {
        const response = await axios.post('/api/attendance/create', asistencia, {
          withCredentials: true,
        });
        setAttendance((prev) => [...prev, response.data.attendance]);
        Swal.fire('¡Éxito!', 'La asistencia ha sido creada correctamente', 'success');
      } catch (error) {
        console.error('Error al agregar asistencia', error);
        Swal.fire('¡Error!', 'Ha ocurrido un error al crear la asistencia', 'error');
      }
    }
  };

  const actualizarAsistencia = async ({ date, category, attendance }) => {
    if (auth === 'admin' || auth === 'user') {
      try {
        const response = await axios.put('/api/attendance/update', {
          date,
          category,
          attendance,
        }, { withCredentials: true });
        setAttendance((prev) =>
          prev.map((a) =>
            a.date === date && a.category === category
              ? { ...a, attendance: response.data.attendance }
              : a
          )
        );
        Swal.fire('¡Éxito!', 'La asistencia ha sido actualizada correctamente', 'success');
      } catch (error) {
        console.error('Error al actualizar la asistencia', error);
        Swal.fire('¡Error!', 'Ha ocurrido un error al actualizar la asistencia', 'error');
      }
    }
  };

  return (
    <AttendanceContext.Provider value={{ asistencias, actualizarAsistencia, agregarAsistencia, ObtenerAsistencia }}>
      {children}
    </AttendanceContext.Provider>
  );
};