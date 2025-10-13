import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import axios from 'axios';
import { LoginContext } from '../login/LoginContext';

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const { auth, authReady } = useContext(LoginContext);

   const fetchConcepts = useCallback(async () => {
  if (!authReady || auth !== 'admin') {
    setConcepts([]);
    return [];
  }
  try {
    setLoadingConcepts(true);
    const response = await axios.get('/api/payments/concepts', {
      withCredentials: true,
    });
    const data = Array.isArray(response.data) ? response.data : [];
    setConcepts(data);
    return data;
  } catch (error) {
    console.error('fetchConcepts: Error fetching concepts:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    setConcepts([]);
    return [];
  } finally {
    setLoadingConcepts(false);
  }
}, [auth, authReady]);

useEffect(() => {
  if (!auth || !authReady) {
    setPayments([]);
    setConcepts([]);
  }
}, [auth, authReady]);

 const createConcept = useCallback(async (name) => {
    if (!authReady || auth !== 'admin') {
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
      console.error('createConcept: Error creating concept:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady]);

    const deleteConcept = useCallback(async (conceptId) => {
    if (!authReady || auth !== 'admin') {
      return;
    }
    if (!conceptId) {
      console.error('deleteConcept: Invalid conceptId:', conceptId);
      throw new Error('ID de concepto inválido');
    }
    try {
      const response = await axios.delete(`/api/payments/concepts/${conceptId}`, {
        withCredentials: true,
      });
      setConcepts((prev) => {
        return prev.filter((concept) => concept._id !== conceptId);
      });
    } catch (error) {
      console.error('deleteConcept: Error deleting concept:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  }, [auth, authReady]);

const fetchPaymentsByStudent = useCallback(async (studentId) => {
    if (!authReady) {
      return [];
    }
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingPayments(true);
      setPayments([]); // Clear payments to prevent showing stale data
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
      console.error('fetchPaymentsByStudent: Error fetching payments:', {
        studentId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setPayments([]);
      throw error;
    } finally {
      setLoadingPayments(false);
    }
  }, [auth, authReady]);

  const fetchAllPayments = useCallback(async () => {
    if (!authReady) {
      return [];
    }
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingPayments(true);
      const response = await axios.get('/api/payments', {
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
      console.error('fetchAllPayments: Error fetching all payments:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setPayments([]);
      throw error;
    } finally {
      setLoadingPayments(false);
    }
  }, [auth, authReady]);

  const fetchPaymentsByDateRange = useCallback(async (startDate, endDate) => {
    if (!authReady) {
      return [];
    }
    if (auth !== 'admin') {
      return [];
    }
    try {
      setLoadingPayments(true);
      const response = await axios.get(
        `/api/payments/date-range?startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );
      const data = Array.isArray(response.data) ? response.data : [];
      setPayments(data);
      return data;
    } catch (error) {
      console.error('fetchPaymentsByDateRange: Error fetching payments by date range:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setPayments([]);
      throw error;
    } finally {
      setLoadingPayments(false);
    }
  }, [auth, authReady]);

  const createPayment = useCallback(async (paymentData) => {
    if (!authReady || auth !== 'admin') {
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
      console.error('createPayment: Error creating payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady]);

   const deletePaymentConcept = useCallback(async (paymentId, studentId) => {
    if (!authReady || auth !== 'admin') {
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
      console.error('deletePaymentConcept: Error deleting payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady, fetchPaymentsByStudent]);

  const updatePaymentConcept = useCallback(async (paymentId, paymentData) => {
    if (!authReady || auth !== 'admin') {
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
      console.error('updatePaymentConcept: Error updating payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady]);




  return (
    <PaymentContext.Provider
      value={{
        payments,
        concepts,
        loadingPayments,
        loadingConcepts,
        fetchPaymentsByStudent,
        fetchAllPayments,
        fetchPaymentsByDateRange,
        createPayment,
        deletePaymentConcept,
        updatePaymentConcept,
        fetchConcepts,
        createConcept,
        deleteConcept
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export default PaymentProvider;