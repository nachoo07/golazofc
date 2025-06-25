import React, { useState, useEffect, useContext, useRef } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { LoginContext } from '../../context/login/LoginContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaBars, FaUsers, FaMoneyBill, FaList, FaClipboardList, FaChartBar, FaExchangeAlt, FaCalendarCheck,
  FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaInfoCircle, FaUserCircle,
  FaChevronDown, FaTimes, FaSearch, FaTimes as FaTimesClear
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import './settings.css';
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';

const Settings = () => {
  const { obtenerCuotas } = useContext(SharesContext);
  const { auth } = useContext(LoginContext);
  const [cuotaBase, setCuotaBase] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const profileRef = useRef(null);
  const { userData, logout } = useContext(LoginContext);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 768);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome /> },
    { name: 'Alumnos', route: '/student', icon: <FaUsers /> },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill /> },
    { name: 'Reportes', route: '/report', icon: <FaChartBar /> },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt /> },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog /> },
    { name: 'Ajustes', route: '/settings', icon: <FaCog /> },
    { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope /> },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
    { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas' }
  ];

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth < 768) {
        setIsMenuOpen(false);
      } else {
        setIsMenuOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/config/cuotaBase', { withCredentials: true });
        const value = response.data.value || 30000;
        setCuotaBase(value);
      } catch (error) {
        setCuotaBase(30000);
        Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveCuotaBase = async () => {
    setLoading(true);
    try {
      const newValue = parseFloat(cuotaBase);
      if (isNaN(newValue) || newValue <= 0) {
        Swal.fire('Error', 'El monto debe ser un número positivo.', 'error');
        return;
      }
      await axios.post('/api/config/set', {
        key: 'cuotaBase',
        value: newValue,
      }, { withCredentials: true });
      Swal.fire('¡Éxito!', 'Monto base actualizado para el próximo mes', 'success');
    } catch (error) {
      console.error('Error al guardar cuota base:', error);
      Swal.fire('Error', 'No se pudo actualizar el monto base', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePendingCuotas = async () => {
    setLoading(true);
    try {
      const response = await axios.put('/api/shares/update-pending', {}, { withCredentials: true });
      if (response.status === 400) {
        Swal.fire('Error', response.data.message, 'error');
      } else {
        await obtenerCuotas();
        Swal.fire('¡Éxito!', 'Cuotas pendientes actualizadas con el nuevo monto base', 'success');
      }
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'No se pudieron actualizar las cuotas', 'error');
      console.error('Error al actualizar cuotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const infoMessage = `
  Cómo Usar los Ajustes de Cuotas
  1. Monto Base de Cuota: Este es el precio que tendrán las cuotas del próximo mes. Por ejemplo, si hoy (6 de junio) cambias el monto de $40.000 a $45.000 y hacés clic en "Guardar Monto Base", las cuotas del 1 de julio serán $45.000. Las de este mes no cambian.  
  2. Actualizar Cuotas Pendientes: Si se te olvidó actualizar antes y las cuotas de este mes (por ejemplo, junio) siguen en $40.000, poné $45.000 en el monto base, guardalo y hacé clic en "Actualizar Cuotas". Esto cambia las cuotas no pagadas a $45.000, pero solo funciona del 1 al 10 de cada mes.  
`;

  return (
    <div className="app-container">
      {windowWidth <= 576 && (
        <AppNavbar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}
      {windowWidth > 576 && (
        <header className="desktop-nav-header">
          <div className="header-logo-setting" onClick={() => navigate('/')}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image" />
          </div>
          <div className="nav-right-section">
            <div
              className="profile-container"
              ref={profileRef}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">
                Hola, {userData?.name || 'Usuario'}
              </span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? 'rotated' : ''}`} />
              {isProfileOpen && (
                <div className="profile-menu">
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
                  <div className="menu-separator"></div>
                  <div
                    className="menu-option logout-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                      setIsProfileOpen(false);
                    }}
                  >
                    <FaUserCircle className="option-icon" /> Cerrar Sesión
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <div className="dashboard-layout">
        <aside className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`sidebar-menu-item ${item.route === '/settings' ? 'active' : ''}`}
                    onClick={() => item.action ? item.action() : navigate(item.route)}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-text">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>
        <main className={`main-content ${!isMenuOpen ? 'expanded' : ''}`}>
          {isLoading ? (
            <div className="loading-message">
              Cargando datos...
            </div>
          ) : (
            <>
              <section className="dashboard-welcome">
                <div className="welcome-text">
                  <h1>Ajustes de Cuotas</h1>
                </div>
              </section>
              {windowWidth > 576 && (
                <section className="search-section">
                  <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar ajustes..."
                      className="search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        className="search-clear"
                        onClick={() => setSearchQuery('')}
                      >
                        <FaTimesClear />
                      </button>
                    )}
                  </div>
                </section>
              )}
              <div className="cards-setting">
                <div className="settings-card">
                  <h3>Monto Base de Cuota</h3>
                  <p>Define el precio de las cuotas para el próximo mes.</p>
                  <div className="input-group">
                    <input
                      type="number"
                      value={cuotaBase}
                      onChange={(e) => setCuotaBase(e.target.value)}
                      className="cuota-input"
                      min="0"
                      placeholder="Ingrese monto"
                      disabled={loading}
                    />
                    <button
                      onClick={handleSaveCuotaBase}
                      disabled={loading}
                      className="action-button save-button"
                    >
                      {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Actualizar Cuotas Pendientes</h3>
                  <p>Cambia las cuotas no pagadas al monto base actual (días 1-10).</p>
                  <button
                    onClick={handleUpdatePendingCuotas}
                    disabled={loading}
                    className="action-button update-button"
                  >
                    {loading ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>
              </div>
              <div className="info-section">
                <FaInfoCircle className="info-icon" />
                <pre className="info-text">{infoMessage}</pre>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;