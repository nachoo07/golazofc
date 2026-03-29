import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../context/login/LoginContext';

const ProtectedRoute = ({ element, role }) => {
  const { auth, loading, authReady } = useContext(LoginContext);
  const location = useLocation();
  const redirectByRole = auth === 'admin' ? '/' : '/homeuser';

  if (loading || !authReady) {
  return element;
}

  if (!auth) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return element;
  }

  if (role && auth !== role) {
    return <Navigate to={redirectByRole} replace />;
  }

  return element;
};

export default ProtectedRoute;
