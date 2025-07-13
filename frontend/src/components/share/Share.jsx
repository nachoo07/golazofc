import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaSearch, FaBars, FaTimes, FaList, FaUsers, FaClipboardList, FaMoneyBill, FaChartBar, FaExchangeAlt,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaUserCircle,
  FaChevronDown, FaTimes as FaTimesClear
} from "react-icons/fa";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import { LoginContext } from "../../context/login/LoginContext";
import "./share.css";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';

const Share = () => {
  const { estudiantes, obtenerEstudiantes, loading: loadingStudents } = useContext(StudentsContext);
  const { cuotas, obtenerCuotas, obtenerCuotasPorEstudiante, loading: loadingCuotas } = useContext(SharesContext);
  const { auth, logout, userData } = useContext(LoginContext);
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const itemsPerPage = 10;

  const menuItems = [
    { name: "Inicio", route: "/", icon: <FaHome />, category: "principal" },
    { name: "Alumnos", route: "/student", icon: <FaUsers />, category: "principal" },
    { name: "Cuotas", route: "/share", icon: <FaMoneyBill />, category: "finanzas" },
    { name: "Reportes", route: "/report", icon: <FaChartBar />, category: "informes" },
    { name: "Movimientos", route: "/motion", icon: <FaExchangeAlt />, category: "finanzas" },
    { name: "Asistencia", route: "/attendance", icon: <FaCalendarCheck />, category: "principal" },
    { name: "Usuarios", route: "/user", icon: <FaUserCog />, category: "configuracion" },
    { name: "Ajustes", route: "/settings", icon: <FaCog />, category: "configuracion" },
    { name: "Envios de Mail", route: "/email-notifications", icon: <FaEnvelope />, category: "comunicacion" },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
    { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas' }
  ];

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
    const queryParams = new URLSearchParams(location.search);
    const page = parseInt(queryParams.get('page')) || 1;
    setCurrentPage(page);
    obtenerEstudiantes();
    obtenerCuotas();
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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [obtenerEstudiantes, obtenerCuotas, location.search]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    return estudiantes.filter((student) => {
      const searchNormalized = String(searchTerm || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const nameNormalized = student.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const lastNameNormalized = student.lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const fullName = `${nameNormalized} ${lastNameNormalized}`;
      const dniSearch = student.dni?.toLowerCase().includes(searchNormalized);
      const matchesSearch = fullName.includes(searchNormalized) || dniSearch;

     const studentCuotas = cuotas.filter((cuota) => cuota.student?._id === student._id);
    let lastCuota = null;
    if (studentCuotas.length > 0) {
      lastCuota = studentCuotas.reduce((latest, current) =>
        new Date(current.date) > new Date(latest.date) ? current : latest,
        studentCuotas[0]
      );
    }
      const matchesStatus =
        statusFilter === "todos" ||
        (lastCuota && lastCuota.state.toLowerCase() === statusFilter.toLowerCase()) ||
        (!lastCuota && statusFilter === "sin cuotas");
      return matchesSearch && matchesStatus;
    });
  }, [estudiantes, cuotas, searchTerm, statusFilter]);

  const handleViewCuotas = async (studentId) => {
    await obtenerCuotasPorEstudiante(studentId);
    navigate(`/share/${studentId}?page=${currentPage}`);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleLogout = async () => {
    logout();
    navigate("/login");
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const handleFilterChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      setStatusFilter(name);
      setCurrentPage(1);
    }
  };

  return (
    <div className={`app-container ${windowWidth <= 576 ? 'mobile-view' : ''}`}>
      {windowWidth <= 576 && (
        <AppNavbar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
        />
      )}
      {windowWidth > 576 && (
        <header className="desktop-nav-header">
          <div className="header-logo" onClick={() => navigate('/')}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image" />
          </div>
          <div className="search-box">
            <FaSearch className="search-symbol" />
            <input
              type="text"
              placeholder="Buscar alumnos..."
              className="search-field"
              value={searchTerm}
              onChange={handleSearchChange}
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
                    className={`sidebar-menu-item ${item.route === '/share' ? 'active' : ''}`}
                    onClick={() => (item.action ? item.action() : navigate(item.route))}
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
          <section className="dashboard-welcome">
            <div className="welcome-text">
              <h1>Panel de Cuotas</h1>
            </div>
          </section>
          {windowWidth <= 576 && (
            <section className="mobile-search-section">
              <div className="mobile-search-container">
                <FaSearch className="mobile-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar alumnos..."
                  className="mobile-search-input"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <button
                    className="mobile-search-clear"
                    onClick={() => setSearchTerm('')}
                  >
                    <FaTimesClear />
                  </button>
                )}
              </div>
            </section>
          )}
          <section className="cuotas-filter">
            <div className="filter-actions">
              <div className="checkbox-filters">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="todos"
                    checked={statusFilter === "todos"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Todos</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pendiente"
                    checked={statusFilter === "pendiente"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Pendiente</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pagado"
                    checked={statusFilter === "pagado"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Pagado</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="vencido"
                    checked={statusFilter === "vencido"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Vencido</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="sin cuotas"
                    checked={statusFilter === "sin cuotas"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Sin Cuotas</span>
                </label>
              </div>
            </div>
          </section>
          <section className="cuotas-table-section">
            <div className="table-wrapper">
              <table className="cuotas-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Dni</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((student, index) => {
                      const studentCuotas = cuotas.filter(
                        (cuota) => cuota.student?._id === student._id
                      );
                      const lastCuota = studentCuotas.length > 0
                        ? studentCuotas.reduce((latest, current) =>
                          new Date(current.date) > new Date(latest.date) ? current : latest,
                          studentCuotas[0]
                        )
                        : null;
                      const cuotaStatus = lastCuota ? lastCuota.state : "Sin cuotas";
                      return (
                        <tr key={student._id}>
                          <td>{indexOfFirstItem + index + 1}</td>
                          <td>{student.name}</td>
                          <td className="student-name">{student.lastName}</td>
                          <td>{student.dni}</td>
                          <td>{cuotaStatus}</td>
                          <td className="action-buttons">
                            <button
                              className="action-btn-share"
                              onClick={() => handleViewCuotas(student._id)}
                            >
                              <FaUserCircle />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table-message">
                        {searchTerm ? (
                          `No hay cuotas que coincidan con "${searchTerm}"`
                        ) : statusFilter !== 'todos' ? (
                          `No hay cuotas con estado "${statusFilter === 'sin cuotas' ? 'Sin cuotas' : statusFilter}"`
                        ) : (
                          "No hay cuotas registradas en el sistema"
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
                className="pagination-btn"
              >
                «
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                <button
                  key={number}
                  className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                  onClick={() => paginate(number)}
                >
                  {number}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
                className="pagination-btn"
              >
                »
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Share;