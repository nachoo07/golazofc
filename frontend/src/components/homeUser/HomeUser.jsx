import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import {
  FaUsers, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaList,
  FaUserCog, FaCog, FaEnvelope, FaBell, FaBars, FaTimes, FaSearch, FaUserCircle, FaChevronDown, FaEllipsisH, FaClipboardList
} from 'react-icons/fa';
import { LoginContext } from '../../context/login/LoginContext';
import "./homeUser.css"
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
const HomeUser = () => {

  const navigate = useNavigate();
  const { auth, logout, userData } = useContext(LoginContext);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [activeItem, setActiveItem] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef(null);
  const menuItems = [
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
  ];

  const handleLogout = async () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Detectar clics fuera del componente para cerrar el menú
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
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth < 576) {
        setIsMenuOpen(false);
      } else {
        setIsMenuOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const filteredMenuItems = menuItems.filter(item =>
    (activeCategory === 'todos' || item.category === activeCategory) &&
    (searchQuery === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`app-container ${window.innerWidth <= 576 ? 'mobile-view' : ''}`}>
      {window.innerWidth <= 576 && (
        <AppNavbar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
        />
      )}
      {window.innerWidth > 576 && (
        <header className="desktop-nav-header">
          <div className="header-logo" onClick={() => navigate('/')}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image" />
          </div>

          <div className="search-box">
            <FaSearch className="search-symbol" />
            <input
              type="text"
              placeholder="Buscar módulos..."
              className="search-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
      )
      }
      <div className="dashboard-layout">
        <aside className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <button className="menu-toggle" onClick={toggleMenu}>
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`sidebar-menu-item `}
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
        <main className="main-content">
          <div className="content-columns">
            <div className="main-column">
              <section className="dashboard-welcome">
                <div className="welcome-text">
                  <h1>Bienvenido al Sistema</h1>
                  <p>Panel de control | <span className="current-date">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                </div>
              </section>
              <section className="dashboard-modules">
                <div className="modules-container">
                  <h2 className="section-title">Módulos del Sistema</h2>
                  <div className="modules-grid">
                    {filteredMenuItems.map((item, index) => (
                      <div
                        key={index}
                        className="module-card"
                        onClick={() => navigate(item.route)}
                      >
                        <div className="module-icon-container">
                          {item.icon}
                        </div>
                        <h3 className="module-title">{item.name}</h3>
                        <span className="module-category-tag">{item.category}</span>
                        <button className="module-menu-btn">
                          <FaEllipsisH />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div >
  );
};

export default HomeUser