import { useContext, useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';
import { FaUserCircle, FaChevronDown, FaUserCog, FaCog } from 'react-icons/fa';
import './navbar.css';

const DesktopNavbar = ({ logoSrc, pageTitle, }) => {
  const { auth, logout, userData } = useContext(LoginContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const isAdmin = auth === 'admin';

  const routeTitleMap = {
    '/': 'Dashboard',
    '/homeuser': 'Inicio',
    '/student': 'Panel de Alumnos',
    '/share': 'Panel de Cuotas',
    '/motion': 'Movimientos',
    '/attendance': 'Registro de Asistencia',
    '/email-notifications': 'Comunicación',
    '/liststudent': 'Listado de Alumnos',
    '/listeconomic': 'Reporte Económico',
    '/settings': 'Ajustes',
    '/user': 'Usuarios'
  };

  const detailTitle = (() => {
    if (location.pathname.startsWith('/paymentstudent/')) {
      return 'Panel de Pagos';
    }

    if (location.pathname.startsWith('/detailstudent/')) {
      return 'Detalle de Alumno';
    }

    if (location.pathname.startsWith('/share/')) {
      const tab = new URLSearchParams(location.search).get('tab');
      return tab === 'pagos' ? 'Panel de Pagos' : 'Panel de Cuotas';
    }

    return null;
  })();

  const currentTitle = pageTitle || detailTitle || routeTitleMap[location.pathname] || 'Panel de Control';

  const handleLogout = () => {
    logout();
    setIsProfileOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  return (
    <header className="desktop-nav-header">
      <div className="desktop-nav-left">
        <div className="header-logo" onClick={() => navigate('/')}>
          <img src={logoSrc} alt="Logo" className="logo-image" />
        </div>
        <h2 className="ui-title-navbar">{currentTitle}</h2>
      </div>
      <div className="nav-right-section">
        <div
          className="profile-container"
          ref={profileRef}
          onClick={() => setIsProfileOpen(prev => !prev)}
        >
          <FaUserCircle className="profile-icon" />
          <span className="profile-greeting">Hola, {userData?.name || 'Usuario'}</span>
          <FaChevronDown className={`arrow-icon ${isProfileOpen ? 'rotated' : ''}`} />
          {isProfileOpen && (
            <div className="profile-menu">
              {isAdmin && (
                <>
                  <div
                    className="menu-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/user');
                      setIsProfileOpen(false);
                    }}
                  >
                    <FaUserCog className="option-icon" /> Mi Perfil
                  </div>
                  <div
                    className="menu-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/settings');
                      setIsProfileOpen(false);
                    }}
                  >
                    <FaCog className="option-icon" /> Configuración
                  </div>
                </>
              )}
              <div className="menu-separator"></div>
              <div
                className="menu-option logout-option"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                <FaUserCircle className="option-icon" /> Cerrar Sesión
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DesktopNavbar;
