import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBars, FaTimes, FaUsers,FaList, FaMoneyBill, FaChartBar, FaExchangeAlt,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaUserCircle, FaChevronDown,
  FaTrash, FaEdit, FaPlus, FaClipboardList, FaSearch, FaTimes as FaTimesClear
} from 'react-icons/fa';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';
import { MotionContext } from '../../context/motion/MotionContext';
import { LoginContext } from '../../context/login/LoginContext';
import { Table, Button } from 'react-bootstrap';
import MotionFormModal from '../modalMotion/MotionFormModal';
import './motion.css';
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';

dayjs.locale('es');
dayjs.extend(utc);

const Motion = () => {
  const { motions, fetchMotions, createMotion, updateMotion, deleteMotion, getMotionsByDateRange, loading } = useContext(MotionContext);
  const { auth, logout, userData } = useContext(LoginContext);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el buscador (solo diseño)

  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    incomeType: '',
  });

  const [selectedMotion, setSelectedMotion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const today = dayjs().format('YYYY-MM-DD');

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal' },
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
    { name: 'Reportes', route: '/report', icon: <FaChartBar />, category: 'informes' },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas' },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion' },
    { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion' },
    { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion' },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
    { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas' }
  ];

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      getMotionsByDateRange(filters.startDate, filters.endDate)
        .catch((error) => {
          setAlertMessage('Error al cargar los movimientos. Intenta de nuevo.');
          setShowAlert(true);
          console.error('Error en getMotionsByDateRange:', error);
        });
    }
  }, [getMotionsByDateRange, filters.startDate, filters.endDate]);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth <= 576) {
        setIsMenuOpen(false);
      } else {
        setIsMenuOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = async (motionData) => {
    try {
      if (isEditing) {
        await updateMotion(motionData._id, motionData);
      } else {
        await createMotion(motionData);
      }
      setSelectedMotion(null);
      setIsEditing(false);
      setShowModal(false);
      await getMotionsByDateRange(filters.startDate, filters.endDate);
    } catch (error) {
      setAlertMessage('Error al guardar el movimiento. Intenta de nuevo.');
      setShowAlert(true);
      console.error('Error en handleSave:', error);
    }
  };

  const handleEdit = (motion) => {
    setSelectedMotion(motion);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedMotion(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMotion(id);
      await getMotionsByDateRange(filters.startDate, filters.endDate);
    } catch (error) {
      setAlertMessage('Error al eliminar el movimiento. Intenta de nuevo.');
      setShowAlert(true);
      console.error('Error en handleDelete:', error);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedMotion(null);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const filteredData = motions
    .filter((item) => {
      if (!item?.date) return false;
      const itemDate = dayjs(item.date);
      return (
        (itemDate.isSame(dayjs(filters.startDate), 'day') ||
          itemDate.isAfter(dayjs(filters.startDate))) &&
        (itemDate.isSame(dayjs(filters.endDate), 'day') ||
          itemDate.isBefore(dayjs(filters.endDate))) &&
        (!filters.incomeType || item.incomeType === filters.incomeType)
      );
    })
    .map((item) => ({
      ...item,
      concept: item.concept || 'Sin concepto',
    }));

  const capitalize = (string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  };

  return (
    <div className={`app-container ${windowWidth <= 576 ? 'mobile-view' : ''}`}>
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
      <div className="dashboard-container">
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
                    className={`sidebar-menu-item ${item.route === '/motion' ? 'active' : ''}`}
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
        <div className="content-container">
          <div className="welcome-text">
            <h1>Movimientos</h1>
          </div>
          {windowWidth > 576 && (
            <section className="search-section">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar movimientos..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimesClear />
                  </button>
                )}
              </div>
            </section>
          )}
          {showAlert && (
            <div className="alert alert-warning" role="alert">
              {alertMessage}
              <button
                type="button"
                className="close"
                onClick={() => setShowAlert(false)}
              >
                ×
              </button>
            </div>
          )}
          <div className="motion-date-filter">
            <div className="motion-filter-section">
              <div className="motion-filter-row">
                <div className="motion-filter-item">
                  <label className="filter-label">Desde:</label>
                  <input
                    type="date"
                    className="motion-filter-input"
                    value={filters.startDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="motion-filter-item">
                  <label className="filter-label">Hasta:</label>
                  <input
                    type="date"
                    className="motion-filter-input"
                    value={filters.endDate}
                    max={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="motion-filter-row">
                <div className="motion-filter-item checkbox-filters">
                  <label className="filter-label">Tipo:</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="todos"
                        checked={filters.incomeType === ""}
                        onChange={() => setFilters((prev) => ({ ...prev, incomeType: "" }))}
                      />
                      <span className="checkbox-custom-motion">Todos</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="ingreso"
                        checked={filters.incomeType === "ingreso"}
                        onChange={() => setFilters((prev) => ({ ...prev, incomeType: "ingreso" }))}
                      />
                      <span className="checkbox-custom-motion">Ingreso</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="egreso"
                        checked={filters.incomeType === "egreso"}
                        onChange={() => setFilters((prev) => ({ ...prev, incomeType: "egreso" }))}
                      />
                      <span className="checkbox-custom-motion">Egreso</span>
                    </label>
                  </div>
                </div>
                <div className="motion-button-container">
                  <Button className="motion-save-btn" onClick={handleCreate}>
                    <span className="text-btn">Agregar Movimiento</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Table className="motion-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th className="metodo-pago-motion">Método</th>
                <th>Tipo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item._id} className="motion-row">
                    <td>{capitalize(item.concept)}</td>
                    <td>{dayjs.utc(item.date).format('DD-MM-YYYY')}</td>
                    <td>{`$ ${item.amount.toLocaleString('es')}`}</td>
                    <td className="metodo-pago-motion">{capitalize(item.paymentMethod)}</td>
                    <td>{capitalize(item.incomeType)}</td>
                    <td className="motion-actions">
                      <Button
                        className="motion-edit-btn"
                        onClick={() => handleEdit(item)}
                      >
                        <span className="icon-btn"><FaEdit /></span>
                      </Button>
                      <Button
                        className="motion-delete-btn"
                        onClick={() => handleDelete(item._id)}
                      >
                        <span className="icon-btn"><FaTrash /></span>
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    <div className="empty-table-message">
                      <p>No hay movimientos para mostrar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          <MotionFormModal
            show={showModal}
            onHide={handleCancel}
            onSave={handleSave}
            selectedMotion={selectedMotion}
            isEditing={isEditing}
            today={today}
          />
        </div>
      </div>
    </div>
  );
};

export default Motion;