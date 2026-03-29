import { createContext, useState, useCallback, useContext, useEffect } from 'react';
import client from '../../api/axios';
import { LoginContext } from '../login/LoginContext';

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [pendingPaymentsRequests, setPendingPaymentsRequests] = useState(0);
  const [pendingConceptsRequests, setPendingConceptsRequests] = useState(0);
  const { auth, authReady } = useContext(LoginContext);
  const loadingPayments = pendingPaymentsRequests > 0;
  const loadingConcepts = pendingConceptsRequests > 0;

  const startPaymentsRequest = useCallback(() => {
    setPendingPaymentsRequests((prev) => prev + 1);
  }, []);

  const endPaymentsRequest = useCallback(() => {
    setPendingPaymentsRequests((prev) => Math.max(0, prev - 1));
  }, []);

  const startConceptsRequest = useCallback(() => {
    setPendingConceptsRequests((prev) => prev + 1);
  }, []);

  const endConceptsRequest = useCallback(() => {
    setPendingConceptsRequests((prev) => Math.max(0, prev - 1));
  }, []);

  const withPaymentsRequest = useCallback(async (requestFn) => {
    startPaymentsRequest();
    try {
      return await requestFn();
    } finally {
      endPaymentsRequest();
    }
  }, [startPaymentsRequest, endPaymentsRequest]);

  const withConceptsRequest = useCallback(async (requestFn) => {
    startConceptsRequest();
    try {
      return await requestFn();
    } finally {
      endConceptsRequest();
    }
  }, [startConceptsRequest, endConceptsRequest]);

  const fetchConcepts = useCallback(async () => {
    if (!authReady || auth !== 'admin') {
      setConcepts([]);
      return [];
    }
    try {
      const response = await withConceptsRequest(() => client.get('/payments/concepts'));
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
      throw error;
    }
  }, [auth, authReady, withConceptsRequest]);

  useEffect(() => {
    if (!auth || !authReady) {
      setPayments([]);
      setConcepts([]);
      setPendingPaymentsRequests(0);
      setPendingConceptsRequests(0);
    }
  }, [auth, authReady]);

  const createConcept = useCallback(async (name) => {
    if (!authReady || auth !== 'admin') {
      return null;
    }
    try {
      const response = await withConceptsRequest(() => client.post('/payments/concepts', { name }));
      const newConcept = response.data.concept;
      setConcepts((prev) => [...prev, newConcept]);
      return newConcept;
    } catch (error) {
      console.error('createConcept: Error creating concept:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady, withConceptsRequest]);

  const deleteConcept = useCallback(async (conceptId) => {
    if (!authReady || auth !== 'admin') {
      return;
    }
    if (!conceptId) {
      console.error('deleteConcept: Invalid conceptId:', conceptId);
      throw new Error('ID de concepto inválido');
    }
    try {
      await withConceptsRequest(() => client.delete(`/payments/concepts/${conceptId}`));
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
  }, [auth, authReady, withConceptsRequest]);

  const fetchPaymentsByStudent = useCallback(async (studentId) => {
    if (!authReady || auth !== 'admin') {
      setPayments([]);
      return [];
    }

    try {
      setPayments([]); // Clear payments to prevent showing stale data
      const response = await withPaymentsRequest(() => client.get(`/payments/student/${studentId}`));
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
    }
  }, [auth, authReady, withPaymentsRequest]);

  const fetchAllPayments = useCallback(async () => {
    if (!authReady || auth !== 'admin') {
      setPayments([]);
      return [];
    }
    try {
      const response = await withPaymentsRequest(() => client.get('/payments'));
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
    }
  }, [auth, authReady, withPaymentsRequest]);

  const fetchPaymentsByDateRange = useCallback(async (startDate, endDate) => {
    if (!authReady || auth !== 'admin') {
      setPayments([]);
      return [];
    }
    try {
      const response = await withPaymentsRequest(() =>
        client.get('/payments/date-range', {
          params: { startDate, endDate },
        })
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
    }
  }, [auth, authReady, withPaymentsRequest]);

  const createPayment = useCallback(async (paymentData) => {
    if (!authReady || auth !== 'admin') {
      return;
    }
    try {
      const response = await withPaymentsRequest(() => client.post('/payments/create', paymentData));
      const newPayment = response.data.payment;
      setPayments((prev) => [...prev, newPayment]);
      return newPayment;
    } catch (error) {
      console.error('createPayment: Error creating payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady, withPaymentsRequest]);

  const deletePaymentConcept = useCallback(async (paymentId) => {
    if (!authReady || auth !== 'admin') {
      return;
    }
    try {
      await withPaymentsRequest(() => client.delete(`/payments/delete/${paymentId}`));
      setPayments((prev) => prev.filter((payment) => payment._id !== paymentId));
      return { deleted: true, paymentId };
    } catch (error) {
      console.error('deletePaymentConcept: Error deleting payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady, withPaymentsRequest]);


  const updatePaymentConcept = useCallback(async (paymentId, paymentData) => {
    if (!authReady || auth !== 'admin') {
      return;
    }
    try {
      const response = await withPaymentsRequest(() => client.put(`/payments/update/${paymentId}`, paymentData));
      const updatedPayment = response.data.payment;
      setPayments((prev) =>
        prev.map((payment) => (payment._id === paymentId ? updatedPayment : payment))
      );
      return updatedPayment;
    } catch (error) {
      console.error('updatePaymentConcept: Error updating payment:', error.response?.data || error.message);
      throw error;
    }
  }, [auth, authReady, withPaymentsRequest]);

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