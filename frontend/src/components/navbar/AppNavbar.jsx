import React, { useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { LoginContext } from '../../context/login/LoginContext';
import { FaUserCircle, FaUsers,FaList, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope,FaClipboardList, FaChevronDown, FaHome } from 'react-icons/fa';
import './navbar.css';
import 'bootstrap/dist/css/bootstrap.min.css';


const AppNavbar = ({ setIsMenuOpen, isMenuOpen }) => {
  const { logout, userData, auth } = useContext(LoginContext);
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileRef = useRef(null);

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

 // Definir los elementos del menú con una propiedad "adminOnly"
  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal', adminOnly: false },
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal', adminOnly: true },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas', adminOnly: true },
    { name: 'Reportes', route: '/report', icon: <FaChartBar />, category: 'informes', adminOnly: true },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas', adminOnly: true },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal', adminOnly: false },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion', adminOnly: true },
    { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion', adminOnly: true },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes', adminOnly: true },
    { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion', adminOnly: true },
    { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas', adminOnly: true }
  ];

    // Filtra los elementos del menú según el rol del usuario
  const filteredMenuItems = menuItems.filter(item => {
    // Si el usuario es admin, muestra todos los elementos
    if (auth === 'admin') return true;
    // Si el usuario no es admin, solo muestra los elementos que no son exclusivos para admin
    return !item.adminOnly;
  });

  const handleMenuItemClick = (route) => {
    navigate(route);
    if (window.innerWidth <= 576) {
      setIsMenuOpen(false);
    }
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

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleDropdownItemClick = (route, action) => {
    navigate(route);
    setIsProfileOpen(false);
  };

  return (
    <Navbar expand="sm" className="app-navbar" fixed="top">
      <Container fluid className="px-0 ">
        <div className="opciones">
          <Navbar.Toggle
            aria-controls="basic-navbar-nav"
            onClick={handleMenuToggle}
            className="me-2 border-0 shadow-none"
          >
            <span className="navbar-toggler-icon"></span>
          </Navbar.Toggle>
        
          <div className="profile-container" ref={profileRef}>
            <div
              className="profile-container-inner d-inline-flex"
              onClick={handleProfileClick}
            >
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">
                Hola, {userData?.name || 'Usuario'}
              </span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? 'rotated' : ''}`} />
            </div>
            {isProfileOpen && (
              <div className="profile-menu">
                <div
                  className="menu-option"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownItemClick('/user', 'Mi Perfil');
                  }}
                >
                  <FaUserCog className="option-icon" /> Mi Perfil
                </div>
                <div
                  className="menu-option"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownItemClick('/settings', 'Configuración');
                  }}
                >
                  <FaCog className="option-icon" /> Configuración
                </div>
                <div className="menu-separator" />
                <div
                  className="menu-option logout-option"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDropdownItemClick('/login', 'Cerrar Sesión');
                    handleLogout();
                  }}
                >
                  <FaUserCircle className="option-icon" /> Cerrar Sesión
                </div>
              </div>
            )}
          </div>
        </div>
        <Navbar.Collapse id="basic-navbar-nav" className="bg-dark text-white">
          <Nav className="flex-column">
              {filteredMenuItems.map((item, index) => (
              <Nav.Link
                key={index}
                onClick={() => handleMenuItemClick(item.route)}
                className="sidebar-menu-item text-white"
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-text">{item.name}</span>
              </Nav.Link>
            ))}
          </Nav>
        </Navbar.Collapse>
        
      </Container>
    </Navbar>
  );
};

export default AppNavbar;