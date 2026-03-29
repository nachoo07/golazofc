import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaUsers, FaMoneyBill, FaExchangeAlt, FaCalendarCheck, FaList,
  FaUserCog, FaCog, FaEnvelope, FaEllipsisH, FaClipboardList
} from 'react-icons/fa';
import "./home.css";
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import Sidebar from '../sidebar/Sidebar';
import DesktopNavbar from '../navbar/DesktopNavbar';

const Home = () => {
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
    { name: 'Reporte', route: '/listeconomic', icon: <FaList />, category: 'finanzas' },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas' },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion' },
    { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion' },
    { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion' },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' }
  ];

  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'principal', name: 'Principal' },
    { id: 'finanzas', name: 'Finanzas' },
    { id: 'informes', name: 'Informes' },
    { id: 'comunicacion', name: 'Comunicación' },
    { id: 'configuracion', name: 'Configuración' },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) => activeCategory === 'todos' || item.category === activeCategory
  );

  const pendingTasks = [
    { title: 'Revisar pagos pendientes', priority: 'alta', route: '/share' },
    { title: 'Revisar Aumento', priority: 'media', route: '/settings' },
    { title: 'Actualizar lista de asistencia', priority: 'baja', route: '/attendance' }
  ];

  const actionTasks = [
    { name: 'Nuevo Alumno', route: '/student', icon: <FaUsers /> },
    { name: 'Registrar Pago', route: '/motion', icon: <FaMoneyBill /> },
    { name: 'Tomar Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
    { name: 'Ver Reporte', route: '/listeconomic', icon: <FaList /> }
  ];

  return (
    <div className={`app-container ${windowWidth <= 576 ? 'mobile-view' : ''}`}>
      {windowWidth <= 576 && (
        <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      )}
      {windowWidth > 576 && (
        <DesktopNavbar
          logoSrc={logo}
        />
      )}
      <div className="dashboard-layout">
        <Sidebar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          activeRoute="/"
        />
        <main className="main-content">
          <div className="content-columns">
            <div className="main-column">
              <section className="module-categories">
                <div className="categories-tabs">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </section>
              <section className="dashboard-modules">
                <div className="modules-container">
                  <div className="modules-section-header">
                    <h2 className="section-title ui-title-section">Módulos del Sistema</h2>
                    <span className="modules-count">{filteredMenuItems.length} módulos</span>
                  </div>
                  <div className="modules-grid">
                    {filteredMenuItems.map((item, index) => (
                      <div
                        key={index}
                        className="module-card"
                        onClick={() => navigate(item.route)}
                      >
                        <div className="module-card-top">
                          <div className="module-icon-container">
                            {item.icon}
                          </div>
                          <button className="module-menu-btn" aria-label={`Opciones de ${item.name}`}>
                            <FaEllipsisH />
                          </button>
                        </div>

                        <h3 className="module-title">{item.name}</h3>
                        <span className="module-category-tag">{item.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
            <div className="sidebar-column">
              <div className="dashboard-sidebar">
                <div className="quick-actions">
                  <div className="panel-header">
                    <h2 className="panel-title">Acciones Rápidas</h2>
                  </div>
                  <div className="quick-actions-grid">
                    {actionTasks.map((task, index) => (
                      <button
                        key={index}
                        className="quick-action-btn"
                        onClick={() => navigate(task.route)}
                      >
                        <div className="quick-action-left">
                          <span className="btn-icon">{task.icon}</span>
                          <span>{task.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pending-tasks">
                  <div className="panel-header">
                    <h2 className="panel-title">Tareas Pendientes</h2>
                  </div>
                  <ul className="tasks-list">
                    {pendingTasks.map((task, index) => (
                      <li key={index} className={`task-item priority-${task.priority}`}>
                        <div className="task-details">
                          <span className="task-name">{task.title}</span>
                          <span className="task-priority">Prioridad {task.priority}</span>
                        </div>
                        <div className="task-actions">
                          <button
                            className="task-action-btn"
                            onClick={() => navigate(task.route)}
                          >
                            Ir
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div >
  );
};

export default Home;
