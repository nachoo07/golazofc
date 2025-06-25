import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch, FaBars, FaList, FaTimes, FaUsers, FaClipboardList, FaMoneyBill, FaChartBar, FaExchangeAlt,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaUserCircle,
  FaChevronDown, FaPlus, FaEdit, FaTrash, FaTimes as FaTimesClear
} from 'react-icons/fa';
import { UsersContext } from '../../context/user/UserContext';
import Swal from 'sweetalert2';
import './user.css';
import AppNavbar from '../navbar/AppNavbar';
import { LoginContext } from '../../context/login/LoginContext';
import logo from '../../assets/logo.png';

const Users = () => {
  const { usuarios, obtenerUsuarios, addUsuarioAdmin, updateUsuarioAdmin, deleteUsuarioAdmin } = useContext(UsersContext);
  const { userData, logout, auth } = useContext(LoginContext);
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const [show, setShow] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mail: '',
    password: '',
    role: 'user',
    state: 'Activo'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const usersPerPage = 10;

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
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    obtenerUsuarios();
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
  }, [obtenerUsuarios]);

  const handleClose = () => {
    setShow(false);
    resetForm();
  };

  const handleShow = () => setShow(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mail.trim()) {
      Swal.fire('Error', 'El nombre y el correo son obligatorios.', 'error');
      return;
    }
    if (!formData._id && !formData.password.trim()) {
      Swal.fire('Error', 'La contraseña es obligatoria para nuevos usuarios.', 'error');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.mail)) {
      Swal.fire('Error', 'El correo no es válido.', 'error');
      return;
    }
    try {
      if (formData._id) {
        await updateUsuarioAdmin(formData._id, {
          name: formData.name,
          mail: formData.mail,
          role: formData.role,
          state: formData.state === 'Activo'
        });
      } else {
        await addUsuarioAdmin({
          name: formData.name,
          mail: formData.mail,
          password: formData.password,
          role: formData.role,
          state: formData.state === 'Activo'
        });
      }
      await obtenerUsuarios(); // Refrescar la lista
      handleClose();
    } catch (error) {
      console.error('Error en handleSubmit:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mail: '',
      password: '',
      role: 'user',
      state: 'Activo'
    });
  };

  const handleShowAddUser = () => {
    resetForm();
    handleShow();
  };

  const handleEdit = (id) => {
    const usuario = usuarios.find((usuario) => usuario._id === id);
    if (usuario.fixed) {
      Swal.fire('Restricción', 'Este usuario no puede ser editado.', 'warning');
      return;
    }
    setFormData({
      _id: usuario._id,
      name: usuario.name,
      mail: usuario.mail,
      password: '',
      role: usuario.role,
      state: usuario.state ? 'Activo' : 'Inactivo'
    });
    handleShow();
  };

  const handleDelete = async (id) => {
    try {
      await deleteUsuarioAdmin(id);
      await obtenerUsuarios(); // Refrescar la lista
    } catch (error) {
      console.error('Error en handleDelete:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const filteredUsers = usuarios.filter((usuario) =>
    usuario.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
      searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    ) ||
    usuario.mail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      default:
        return role;
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
              placeholder="Buscar usuarios..."
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
                    className={`sidebar-menu-item ${item.route === '/user' ? 'active' : ''}`}
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
          <section className="dashboard-welcome-user">
            <div className="welcome-text">
              <h1>Panel de Usuarios</h1>
            </div>
            <div className="filter-actions">
              <button className="add-btn" onClick={handleShowAddUser}>
                <FaPlus /> Agregar Usuario
              </button>
            </div>
          </section>
          {windowWidth <= 576 && (
            <section className="mobile-search-section">
              <div className="mobile-search-container">
                <FaSearch className="mobile-search-icon" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
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
          <section className="users-table-section">
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Mail</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.length > 0 ? (
                    currentUsers.map((usuario, index) => (
                      <tr key={usuario._id || index}>
                        <td>{indexOfFirstUser + index + 1}</td>
                        <td>{usuario.name}</td>
                        <td>{usuario.mail}</td>
                        <td>{getRoleName(usuario.role)}</td>
                        <td>{usuario.state ? 'Activo' : 'Inactivo'}</td>
                        <td className="action-buttons">
                          <button
                            className="action-btn-user"
                            onClick={() => handleEdit(usuario._id)}
                            disabled={usuario.fixed}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn-user"
                            onClick={() => handleDelete(usuario._id)}
                            disabled={usuario.fixed}
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No hay usuarios que coincidan con la búsqueda.
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
          {show && (
            <div className="custom-modal">
              <div className="modal-content">
                <div className="modal-header-user">
                  <h2>{formData._id ? 'Editar Usuario' : 'Agregar Usuario'}</h2>
                  <button className="modal-close" onClick={handleClose}>
                    <FaTimes />
                  </button>
                </div>
                <div className="modal-body-user">
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        maxLength={50}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Mail</label>
                      <input
                        type="email"
                        name="mail"
                        value={formData.mail}
                        onChange={handleChange}
                        required
                        pattern="\S+@\S+\.\S+"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Contraseña</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!formData._id}
                        minLength={formData._id ? 0 : 6}
                        maxLength={50}
                        disabled={!!formData._id}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        disabled={!formData._id}
                        className="form-control"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Rol</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        className="form-control"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn-modal-cancelar" onClick={handleClose}>Cancelar</button>
                      <button type="submit" className="btn-modal-guardar">Guardar</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Users;