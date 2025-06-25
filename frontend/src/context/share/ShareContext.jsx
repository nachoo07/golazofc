import { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import axios from "axios";
import { LoginContext } from "../login/LoginContext";

export const SharesContext = createContext();

const SharesProvider = ({ children }) => {
  const [cuotas, setCuotas] = useState([]);
  const [cuotasStatusCount, setCuotasStatusCount] = useState({
    pendientes: 0,
    vencidas: 0,
    pagadas: 0,
  });
  const [loading, setLoading] = useState(true); // Inicialmente true para evitar parpadeo
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const { auth, waitForAuth } = useContext(LoginContext);
  const hasFetched = useRef(false);

  const obtenerCuotas = useCallback(async () => {
    if (auth !== "admin") return;
    try {
      setLoading(true);
      const response = await axios.get("/api/shares", {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setCuotas(data);
    } catch (error) {
      console.error("Error obteniendo cuotas:", error);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const obtenerCuotasStatusCount = useCallback(async () => {
    if (auth !== "admin") return;
    try {
      setLoading(true);
      const response = await axios.get("/api/shares/status-count", {
        withCredentials: true,
      });
      setCuotasStatusCount({
        pendientes: response.data.pendientes || 0,
        vencidas: response.data.vencidas || 0,
        pagadas: response.data.pagadas || 0,
      });
    } catch (error) {
      console.error("Error obteniendo conteos de cuotas:", error, error.response?.data);
      setCuotasStatusCount({ pendientes: 0, vencidas: 0, pagadas: 0 });
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const obtenerCuotasPorEstudiante = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/shares/student/${studentId}`, {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setCuotas((prev) => [...prev.filter((cuota) => cuota.student?._id !== studentId), ...data]);
    } catch (error) {
      console.error("Error obteniendo cuotas por estudiante:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCuota = useCallback(async (cuota) => {
    if (auth !== "admin") return;
    try {
      setLoading(true);
      const response = await axios.post("/api/shares/create", cuota, {
        withCredentials: true,
      });
      const newCuota = response.data.share;
      setCuotas((prev) => [...(Array.isArray(prev) ? prev : []), newCuota]);
      await obtenerCuotasStatusCount();
    } catch (error) {
      console.error("Error al crear la cuota:", error);
      throw new Error("Ha ocurrido un error al crear la cuota");
    } finally {
      setLoading(false);
    }
  }, [auth, obtenerCuotasStatusCount]);

  const deleteCuota = useCallback(async (id) => {
    if (auth !== "admin") return;
    try {
      setLoading(true);
      await axios.delete(`/api/shares/delete/${id}`, {
        withCredentials: true,
      });
      setCuotas((prev) => prev.filter((cuota) => cuota._id !== id));
      await obtenerCuotasStatusCount();
    } catch (error) {
      console.error("Error al eliminar cuota:", error);
      throw new Error("Ha ocurrido un error al eliminar la cuota");
    } finally {
      setLoading(false);
    }
  }, [auth, obtenerCuotasStatusCount]);

  const updateCuota = useCallback(async (cuota) => {
    if (auth !== "admin") return;
    try {
      setLoading(true);
      const response = await axios.put(`/api/shares/update/${cuota._id}`, cuota, {
        withCredentials: true,
      });
      const updatedCuota = response.data.share;
      setCuotas((prev) =>
        prev.map((c) => (c._id === updatedCuota._id ? updatedCuota : c))
      );
      await obtenerCuotasStatusCount();
    } catch (error) {
      console.error("Error al actualizar cuota:", error);
      throw new Error("Ha ocurrido un error al actualizar la cuota");
    } finally {
      setLoading(false);
    }
  }, [auth, obtenerCuotasStatusCount]);

  const obtenerCuotasPorFecha = useCallback(async (fecha) => {
    try {
      setLoading(true);
      setCuotas([]);
      const response = await axios.get(`/api/shares/date/${fecha}`, {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setCuotas(data);
      return data;
    } catch (error) {
      console.error('Error obteniendo cuotas por fecha:', error);
      throw new Error('No se pudieron obtener las cuotas por fecha.');
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerCuotasPorFechaRange = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setCuotas([]);
      const response = await axios.get(`/api/shares/date-range?startDate=${startDate}&endDate=${endDate}`, {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setCuotas(data);
      return data;
    } catch (error) {
      console.error('Error obteniendo cuotas por rango de fechas:', error);
      throw new Error('No se pudieron obtener las cuotas por rango de fechas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await waitForAuth();
      if (auth === "admin" && !hasFetched.current) {
        hasFetched.current = true;
        await obtenerCuotasStatusCount();
        setIsInitialLoadComplete(true);
      }
    };
    fetchData();
  }, [auth, waitForAuth, obtenerCuotasStatusCount]);

  return (
    <SharesContext.Provider
      value={{
        cuotas,
        cuotasStatusCount,
        loading,
        isInitialLoadComplete,
        obtenerCuotas,
        obtenerCuotasStatusCount,
        obtenerCuotasPorEstudiante,
        addCuota,
        deleteCuota,
        updateCuota,
        obtenerCuotasPorFecha,
        obtenerCuotasPorFechaRange,
        setCuotas,
      }}
    >
      {children}
    </SharesContext.Provider>
  );
};

export default SharesProvider;