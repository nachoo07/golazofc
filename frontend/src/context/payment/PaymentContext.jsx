import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LoginContext } from '../login/LoginContext';

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const { auth, waitForAuth } = useContext(LoginContext);

  const fetchConcepts = useCallback(async () => {
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingConcepts(true);
      const response = await axios.get('/api/payments/concepts', {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data.message 
          ? [] 
          : [];
      setConcepts(data);
      return data;
    } catch (error) {
      console.error('Error fetching concepts:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Swal.fire('¡Error!', 'No se pudieron obtener los conceptos.', 'error');
      setConcepts([]);
      return [];
    } finally {
      setLoadingConcepts(false);
    }
  }, [auth]);

  const createConcept = useCallback(async (name) => {
    if (auth !== 'admin') {
      return null;
    }
    try {
      const response = await axios.post('/api/payments/concepts', { name }, {
        withCredentials: true,
      });
      const newConcept = response.data.concept;
      setConcepts((prev) => [...prev, newConcept]);
      return newConcept;
    } catch (error) {
      console.error('Error creating concept:', error.response?.data || error.message);
      throw error;
    }
  }, [auth]);

  const deleteConcept = useCallback(async (conceptId) => {
    if (auth !== 'admin') {
      return;
    }
    try {
      await axios.delete(`/api/payments/concepts/${conceptId}`, {
        withCredentials: true,
      });
      setConcepts((prev) => prev.filter((concept) => concept._id !== conceptId));
    } catch (error) {
      console.error('Error deleting concept:', error.response?.data || error.message);
      Swal.fire('¡Error!', error.response?.data?.message || 'No se pudo eliminar el concepto.', 'error');
      throw error;
    }
  }, [auth]);

  const fetchPaymentsByStudent = useCallback(async (studentId) => {
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingPayments(true);
      const response = await axios.get(`/api/payments/student/${studentId}`, {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data.message 
          ? [] 
          : [];
      setPayments(data);
      return data;
    } catch (error) {
      console.error('Error fetching payments:', {
        studentId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Swal.fire('¡Error!', 'No se pudieron obtener los pagos. Revisa la consola para más detalles.', 'error');
      return [];
    } finally {
      setLoadingPayments(false);
    }
  }, [auth]);

  const fetchAllPayments = useCallback(async () => {
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingPayments(true);
      const response = await axios.get(`/api/payments`, {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data.message 
          ? [] 
          : [];
      setPayments(data);
      return data;
    } catch (error) {
      console.error('Error fetching all payments:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      Swal.fire('¡Error!', 'No se pudieron obtener los pagos. Revisa la consola para más detalles.', 'error');
      setPayments([]);
      return [];
    } finally {
      setLoadingPayments(false);
    }
  }, [auth]);

  const createPayment = useCallback(async (paymentData) => {
    if (auth !== 'admin') {
      return;
    }
    try {
      const response = await axios.post('/api/payments/create', paymentData, {
        withCredentials: true,
      });
      const newPayment = response.data.payment;
      setPayments((prev) => [...prev, newPayment]);
      return newPayment;
    } catch (error) {
      console.error('Error creating payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth]);

  const deletePaymentConcept = useCallback(async (paymentId, studentId) => {
    if (auth !== 'admin') {
      return;
    }
    try {
      await axios.delete(`/api/payments/delete/${paymentId}`, {
        withCredentials: true,
      });
      const freshPayments = await fetchPaymentsByStudent(studentId);
      setPayments(freshPayments);
      return freshPayments;
    } catch (error) {
      console.error('Error deleting payment:', error.response?.data || error.message);
      Swal.fire('¡Error!', error.response?.data?.message || 'No se pudo eliminar el pago.', 'error');
      const freshPayments = await fetchPaymentsByStudent(studentId);
      setPayments(freshPayments);
      return freshPayments;
    }
  }, [auth, fetchPaymentsByStudent]);

  const updatePaymentConcept = useCallback(async (paymentId, paymentData) => {
    if (auth !== 'admin') {
      return;
    }
    try {
      const response = await axios.put(`/api/payments/update/${paymentId}`, paymentData, {
        withCredentials: true,
      });
      const updatedPayment = response.data.payment;
      setPayments((prev) =>
        prev.map((payment) => (payment._id === paymentId ? updatedPayment : payment))
      );
      return updatedPayment;
    } catch (error) {
      console.error('Error updating payment:', error.response?.data || error.message);
      Swal.fire('¡Error!', 'No se pudo actualizar el pago.', 'error');
      throw error;
    }
  }, [auth]);

  return (
    <PaymentContext.Provider
      value={{
        payments,
        concepts,
        loadingPayments,
        loadingConcepts,
        fetchPaymentsByStudent,
        fetchAllPayments,
        createPayment,
        deletePaymentConcept,
        updatePaymentConcept,
        fetchConcepts,
        createConcept,
        deleteConcept,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export default PaymentProvider;