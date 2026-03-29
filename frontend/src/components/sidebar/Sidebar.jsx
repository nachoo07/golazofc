import React, { useContext } from 'react';
import { FaTimes, FaBars } from 'react-icons/fa';
import {
  FaList, FaUsers, FaClipboardList, FaMoneyBill, FaExchangeAlt,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome,
  FaFutbol, FaSignOutAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { LoginContext } from '../../context/login/LoginContext';
import './sidebar.css';

const Sidebar = ({ isMenuOpen, setIsMenuOpen, activeRoute = '' }) => {
  const navigate = useNavigate();
  const { auth, logout } = useContext(LoginContext);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const handleMenuItemClick = (item) => {
    const hasRoute = Boolean(item.route);

    if (item.route) {
      navigate(item.route);
    }
    if (item.action) {
      item.action();
    }

    if (isMobile && hasRoute) {
      setIsMenuOpen(false);
    }
  };

  const adminSections = [
    {
      title: 'OPERACIÓN',
      items: [
        { name: 'Inicio', route: '/', icon: <FaHome /> },
        { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
        { name: 'Cuotas y Pagos', route: '/share', icon: <FaMoneyBill /> },
        { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
        { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
        { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> }
      ]
    },
    {
      title: 'ANÁLISIS',
      items: [
        { name: 'Reporte', route: '/listeconomic', icon: <FaList /> },
        { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList /> }
      ]
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { name: 'Ajustes', route: '/settings', icon: <FaCog /> }
      ]
    },
    {
      title: 'ADMIN',
      items: [
        { name: 'Usuarios', route: '/user', icon: <FaUserCog /> }
      ]
    }
  ];

  const userSections = [
    {
      title: 'OPERACIÓN',
      items: [
        { name: 'Inicio', route: '/homeuser', icon: <FaHome /> },
        { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
      ]
    }
  ];

  const sections = auth === 'admin' ? adminSections : userSections;

  const handleMobileLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  return (
    <>
      {isMobile && isMenuOpen && <button type="button" className="sb-mobile-backdrop" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" />}
      <aside className={`sb-container ${isMenuOpen ? 'sb-open' : 'sb-closed'}`}>
        <div className="sb-header">
          <div className="sb-brand">
            <div className="sb-brand-icon">
              <FaFutbol />
            </div>
            <div className="sb-brand-text">Golazo</div>
          </div>
          <button className="sb-toggle-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        <nav className="sb-nav-content">
          {sections.map((section) => (
            <div className="sb-section-block" key={section.title}>
              <p className="sb-section-title">{section.title}</p>
              <ul className="sb-menu-list">
                {section.items.map((item) => (
                  <li
                    key={item.route || item.name}
                    className={`sb-item ${item.route === activeRoute ? 'sb-active' : ''}`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span className="sb-icon">{item.icon}</span>
                    <span className="sb-text">{item.name}</span>
                    {item.route === activeRoute && <div className="sb-active-indicator" />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="sb-mobile-footer">
          <button type="button" className="sb-mobile-logout-btn" onClick={handleMobileLogout}>
            <span className="sb-icon"><FaSignOutAlt /></span>
            <span className="sb-text">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;