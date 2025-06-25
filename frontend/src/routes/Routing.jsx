import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../components/login/Login';
import PageHome from '../pages/home/PageHome';
import PageStudent from '../pages/student/PageStudent';
import { PageUser } from '../pages/users/PageUser';
import PageDetail from '../pages/detailStudent/PageDetail';
import PageHomeUser from '../pages/homeUser/PageHomeUser';
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginContext } from '../context/login/LoginContext';
import PageShare from '../pages/share/PageShare';
import ProtectedRoute from '../routes/ProtectedRoute';
import PageAttendance from '../pages/attendance/PageAttendance';
import PageReport from '../pages/report/PageReport';
import PageMotion from '../pages/motion/PageMotion';
import Settings from '../components/settings/Settings'; // Nueva importación
import EmailNotification from '../components/email/EmailNotification'; // Nueva importación
import PageDetailShare from '../pages/detailShare/PageDetailShare';
import PagePaymentStudent from '../pages/payment/PagePaymentStudent';
import PageListaStudent from '../pages/listStudent/PageListaStudent';
import PageListEconomic from '../pages/listEconomic/PageListEconomic';

const Routing = () => {
  const { auth } = useContext(LoginContext);

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={auth ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/attendance"
        element={<ProtectedRoute element={<PageAttendance />} />}
      />


      {/* Ruta para usuarios comunes */}
      <Route
        path="/homeuser"
        element={<ProtectedRoute element={<PageHomeUser />} role='user' />}
      />
      {/* Rutas para administradores */}
      <Route
        path="/"
        element={<ProtectedRoute element={<PageHome />} role="admin" />}
      />
      <Route
        path="/student"
        element={<ProtectedRoute element={<PageStudent />} role="admin" />}
      />
      <Route
        path="/motion"
        element={<ProtectedRoute element={<PageMotion />} role="admin" />}
      />
      <Route
        path="/report"
        element={<ProtectedRoute element={<PageReport />} role="admin" />}
      />
      <Route
        path="/user"
        element={<ProtectedRoute element={<PageUser />} role="admin" />}
      />
      <Route
        path="/share"
        element={<ProtectedRoute element={<PageShare />} role="admin" />}
      />
      <Route
        path="/detailstudent/:id"
        element={<ProtectedRoute element={<PageDetail />} role="admin" />}
      />
       <Route
        path="/listeconomic"
        element={<ProtectedRoute element={<PageListEconomic />} role="admin" />}
      />
      <Route
        path="/share"
        element={<ProtectedRoute element={<PageShare />} role="admin" />}
      />
      <Route
        path="/share/:studentId"
        element={<ProtectedRoute element={<PageDetailShare />} role="admin" />}
      />
      <Route
        path="/settings"
        element={<ProtectedRoute element={<Settings />} role="admin" />}
      />
        <Route
        path="/liststudent"
        element={<ProtectedRoute element={<PageListaStudent/>} role="admin" />}
      />
      <Route
        path="/paymentstudent/:id"
        element={<ProtectedRoute element={<PagePaymentStudent />} role="admin" />}
      />
      <Route path="/email-notifications"
        element={<ProtectedRoute element={<EmailNotification />} role="admin" />} />
    </Routes>
  );
};

export default Routing;