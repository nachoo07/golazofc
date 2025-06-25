import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../context/login/LoginContext';

const ProtectedRoute = ({ element, role }) => {
  const { auth, loading } = useContext(LoginContext);
  const location = useLocation();

  if (loading) {
    return element;
  }

  if (!auth) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return element;
  }

  if (role && auth !== role) {
    return <Navigate to="/homeuser" replace />;
  }

  return element;
};

export default ProtectedRoute;