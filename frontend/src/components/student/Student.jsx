import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {FaSearch, FaBars, FaList, FaTimes, FaUsers, FaClipboardList, FaMoneyBill, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaUserCircle,
  FaChevronDown, FaPlus, FaEdit, FaTrash, FaTimes as FaTimesClear, FaFileExcel} from "react-icons/fa";
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import StudentFormModal from "../modal/StudentFormModal";
import Swal from "sweetalert2";
import "./student.css";
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import { Spinner } from "react-bootstrap";
import { format, parse, parseISO, isValid } from 'date-fns';
import * as XLSX from 'xlsx';

const Student = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { estudiantes, obtenerEstudiantes, addEstudiante, updateEstudiante, deleteEstudiante, importStudents, } = useContext(StudentsContext);
  const { auth, logout, userData, authReady } = useContext(LoginContext);
  const [student, setStudent] = useState(null);
  const { id } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [show, setShow] = useState(false);
  const profileRef = useRef(null);
  const [editStudent, setEditStudent] = useState(null);
  const [filterState, setFilterState] = useState("todos");
  const [formData, setFormData] = useState({
    name: "",lastName: "",dni: "",birthDate: "",address: "",mail: "",category: "",guardianName: "",guardianPhone: "",profileImage: null,state: "Activo",hasSiblingDiscount: false, sure: false, league: false,});
 const [currentPage, setCurrentPage] = useState(1);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImporting, setIsImporting] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const studentsPerPage = 10;

  const menuItems = [
    { name: "Inicio", route: "/", icon: <FaHome />, category: "principal" },
    { name: "Alumnos", route: "/student", icon: <FaUsers />, category: "principal" },
    { name: "Cuotas", route: "/share", icon: <FaMoneyBill />, category: "finanzas" },
    { name: "Movimientos", route: "/motion", icon: <FaExchangeAlt />, category: "finanzas", },
    { name: "Asistencia", route: "/attendance", icon: <FaCalendarCheck />, category: "principal", },
    { name: "Usuarios", route: "/user", icon: <FaUserCog />, category: "configuración" },
    { name: "Ajustes", route: "/settings", icon: <FaCog />, category: "configuración" },
    { name: "Envíos de correo", route: "/email-notifications", icon: <FaEnvelope />, category: "comunicación", },
    { name: "Listado de alumnos", route: "/liststudent", icon: <FaClipboardList />, category: "informes", },
    { name: "Lista de movimientos", route: "/listeconomic", icon: <FaList />, category: "finanzas", },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (!auth || (auth !== 'admin' && auth !== 'user')) {
      Swal.fire('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.', 'error');
      navigate('/login');
      return;
    }
    const queryParams = new URLSearchParams(location.search);
    const page = parseInt(queryParams.get('page')) || 1;
    const search = queryParams.get('search') || "";
    const state = queryParams.get('state') || "todos";

    setCurrentPage(page);
    setSearchTerm(search);
    setFilterState(state);

    const fetchData = async () => {
      try {
        await obtenerEstudiantes();
      } catch (error) {
        console.error('Student: Error fetching students:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        if (error.response?.status === 401) {
          Swal.fire('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.', 'error');
          navigate('/login');
        } else if (error.response?.status === 404) {
          Swal.fire('¡Error!', 'No se encontraron estudiantes.', 'error');
        } else {
          Swal.fire('¡Error!', error.response?.data?.message || 'No se pudieron cargar los estudiantes.', 'error');
        }
      }
    };
    fetchData();

    setIsInitialMount(false);
  }, [auth, authReady, navigate, location.search, obtenerEstudiantes]);

    useEffect(() => {
    if (isInitialMount) return;

    const queryParams = new URLSearchParams();
    if (currentPage !== 1) queryParams.set('page', currentPage);
    if (searchTerm) queryParams.set('search', searchTerm);
    if (filterState !== 'todos') queryParams.set('state', filterState);

    const queryString = queryParams.toString();
    const newUrl = queryString ? `/student?${queryString}` : '/student';
    
    if (location.pathname + location.search !== newUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [currentPage, searchTerm, filterState, navigate, location.pathname, location.search, isInitialMount]);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setAlertMessage('Por favor selecciona un archivo Excel');
      setShowAlert(true);
      return;
    }

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      setAlertMessage('El archivo debe ser un Excel (.xlsx)');
      setShowAlert(true);
      return;
    }

    setIsImporting(true);

    try {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const studentList = jsonData.map((row, index) => {
            let birthDate = row['Fecha de Nacimiento'] || '';
            if (birthDate) {
              if (typeof birthDate === 'number') {
                const jsDate = XLSX.SSF.parse_date_code(birthDate);
                birthDate = format(new Date(jsDate.y, jsDate.m - 1, jsDate.d), 'yyyy-MM-dd');
              } else if (typeof birthDate === 'string') {
                const parsedDate = parse(birthDate, 'dd/MM/yyyy', new Date());
                if (isValid(parsedDate)) {
                  birthDate = format(parsedDate, 'yyyy-MM-dd');
                } else {
                  console.warn(`Fecha inválida en fila ${index + 2}: ${birthDate}`);
                  birthDate = '';
                }
              }
            }

            const profileImage = row['Imagen de Perfil'] || '';
            return {
              name: row.Nombre || '',
              lastName: row.Apellido || '',
              dni: row.DNI ? String(row.DNI) : '',
              birthDate,
              address: row.Dirección || '',
              category: row.Categoría || '',
              mail: row.Email || '',
              guardianName: row['Nombre del Tutor'] || '',
              guardianPhone: row['Teléfono del Tutor'] || '',
              profileImage,
              state: row.Estado || 'Activo',
              hasSiblingDiscount: row['Descuento por Hermano'] === 'Sí' || false,
              sure: row['Seguro'] === 'Si' || false,
              league: row['Liga'] === '1' || false,
              rowNumber: index + 2, // Incluir el número de fila (comienza en 2)
            };
          });

          if (studentList.length === 0) {
            throw new Error('El archivo Excel no contiene datos válidos');
          }
          const result = await importStudents(studentList);
          Swal.fire({
            title: result.icon === 'success' ? '¡Éxito!' : '¡Error!',
            html: result.message,
            icon: result.icon,
            confirmButtonText: 'Aceptar',
            width: '600px',
            customClass: {
              htmlContainer: 'swal2-html-container-scroll',
            },
          });
        } catch (error) {
          console.error('handleImportExcel: Error processing Excel:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          if (error.response?.status === 401) {
            Swal.fire('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.', 'error');
            navigate('/login');
          } else {
            Swal.fire({
              title: '¡Error!',
              html: error.message || 'Error al procesar el archivo Excel',
              icon: 'error',
              confirmButtonText: 'Aceptar',
              width: '600px',
              customClass: {
                htmlContainer: 'swal2-html-container-scroll',
              },
            });
          }
            } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('handleImportExcel: Error importing:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setIsImporting(false);
      e.target.value = '';
      Swal.fire('¡Error!', 'Error al procesar el archivo Excel', 'error');
    }
  };

    const handleViewPayments = (estudianteId) => {
    const queryParams = new URLSearchParams();
    if (currentPage !== 1) queryParams.set('page', currentPage);
    if (searchTerm) queryParams.set('search', searchTerm);
    if (filterState !== 'todos') queryParams.set('state', filterState);

    const queryString = queryParams.toString();
    navigate(`/paymentstudent/${estudianteId}${queryString ? `?${queryString}` : ''}`);
  };

  const filteredStudents = estudiantes.filter((estudiante) => {
    const searchNormalized = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const nameNormalized = estudiante.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const lastNameNormalized = estudiante.lastName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const fullName = `${nameNormalized} ${lastNameNormalized}`;

    const dniSearch = estudiante.dni
      ? estudiante.dni.toString().toLowerCase().includes(searchNormalized)
      : false;

    const matchesSearch = fullName.includes(searchNormalized) || dniSearch;

    const matchesState =
      filterState === "todos" ||
      estudiante.state.toLowerCase() === filterState.toLowerCase();
    return matchesSearch && matchesState;
  });

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent,indexOfLastStudent);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

 const handleShow = (student = null) => {
  if (student) {
    setEditStudent(student);
    const dateInputValue = student.birthDate || '';
    setFormData({
      ...student,
      birthDate: dateInputValue,
      dateInputValue,
      profileImage: student.profileImage,
      hasSiblingDiscount: student.hasSiblingDiscount || false,
      sure: student.sure || null, // Usar null si no hay valor
      league: student.league || null, // Usar null si no hay valor
    });
  } else {
    setEditStudent(null);
    setFormData({
      name: '',
      lastName: '',
      dni: '',
      birthDate: '',
      dateInputValue: '',
      address: '',
      mail: '',
      category: '',
      guardianName: '',
      guardianPhone: '',
      profileImage: null,
      state: 'Activo',
      hasSiblingDiscount: undefined,
      sure: null, // Valor nulo por defecto
      league: null, // Valor nulo por defecto
    });
  }
  setShow(true);
};

  const handleClose = () => {
    setShow(false);
  };

 const handleChange = (e) => {
  const { name, value, type, checked, files } = e.target;
  if (name === 'dateInputValue') {
    setFormData({
      ...formData,
      birthDate: value,
      dateInputValue: value,
    });
  } else {
    setFormData({
      ...formData,
      [name]: type === 'checkbox' 
        ? (name === 'sure' || name === 'league' 
          ? (checked ? 'Si' : 'No') 
          : checked) 
        : type === 'file' 
          ? files[0] 
          : value,
    });
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.profileImage instanceof File) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif'];
        if (!validImageTypes.includes(formData.profileImage.type)) {
          Swal.fire('¡Error!', 'La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.', 'error');
          return;
        }
        if (formData.profileImage.size > 5 * 1024 * 1024) {
          Swal.fire('¡Error!', 'La imagen de perfil no debe exceder los 5MB.', 'error');
          return;
        }
      }

      const formattedData = {
        ...formData,
        birthDate: formData.dateInputValue,
      };

      let result;
      if (editStudent) {
        result = await updateEstudiante(formattedData);
        if (result.success) {
          Swal.fire('¡Éxito!', 'El perfil del estudiante ha sido actualizado correctamente.', 'success');
        } else {
          throw new Error(result.message);
        }
      } else {
        result = await addEstudiante(formattedData);
        if (result.success) {
          Swal.fire('¡Éxito!', 'El estudiante ha sido agregado correctamente.', 'success');
        } else {
          throw new Error(result.message);
        }
      }
      setShow(false);
    } catch (error) {
      console.error('handleSubmit: Error submitting student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        Swal.fire('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.', 'error');
        navigate('/login');
      } else if (error.response?.status === 400) {
        Swal.fire('¡Error!', error.response?.data?.message || 'Los datos del estudiante son inválidos.', 'error');
      } else if (error.response?.status === 404) {
        Swal.fire('¡Error!', 'Estudiante no encontrado.', 'error');
      } else {
        Swal.fire('¡Error!', error.response?.data?.message || (editStudent ? 'No se pudo actualizar el estudiante.' : 'No se pudo agregar el estudiante.'), 'error');
      }
    }
  };

    const handleDelete = async (studentId) => {
    try {
      await deleteEstudiante(studentId);
      Swal.fire('¡Éxito!', 'El estudiante ha sido eliminado correctamente.', 'success');
    } catch (error) {
      console.error('handleDelete: Error deleting student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        Swal.fire('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.', 'error');
        navigate('/login');
      } else {
        Swal.fire('¡Error!', error.response?.data?.message || 'No se pudo eliminar el estudiante.', 'error');
      }
    }
  };

   const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

 const handleLogout = async () => {
    await logout();
    navigate("/login");
    setIsMenuOpen(false);
  };

  const handleFilterChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      setFilterState(name);
      setCurrentPage(1);
    }
  };

   const handleViewDetail = (studentId) => {
    const queryParams = new URLSearchParams();
    if (currentPage !== 1) queryParams.set('page', currentPage);
    if (searchTerm) queryParams.set('search', searchTerm);
    if (filterState !== 'todos') queryParams.set('state', filterState);

    const queryString = queryParams.toString();
    navigate(`/detailstudent/${studentId}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className={`app-container ${windowWidth <= 576 ? "mobile-view" : ""}`}>
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
          <div className="header-logo" onClick={() => navigate("/")}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image"/>
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
                Hola, {userData?.name || "Usuario"}
              </span>
              <FaChevronDown
                className={`arrow-icon ${isProfileOpen ? "rotated" : ""}`}
              />
              {isProfileOpen && (
                <div className="profile-menu">
                  <div
                    className="menu-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/user");
                      setIsProfileOpen(false);
                    }}
                  >
                    <FaUserCog className="option-icon" /> Mi Perfil
                  </div>
                  <div
                    className="menu-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/settings");
                      setIsProfileOpen(false);
                    }}
                  >
                    <FaCog className="option-icon" /> Configuración
                  </div>
                  <div className="menu-divider"></div>
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
        <aside className={`sidebar ${isMenuOpen ? "open" : "closed"}`}>
          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <button className="menu-toggle" onClick={toggleMenu}>
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`sidebar-menu-item ${item.route === "/student" ? "active" : ""}`
                    }
                    onClick={() =>
                      item.route && navigate(item.route)
                    }
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
              <h1>Panel de Alumnos</h1>
            </div>
          </section>
          {windowWidth <= 576 && (
            <div className="mobile-search-container">
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
                    onClick={() => setSearchTerm("")}
                  >
                    <FaTimesClear />
                  </button>
                )}
              </div>
            </div>
          )}
          <section className="students-filter">
            <div className="filter-actions">
              <div className="checkbox-filters">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="todos"
                    checked={filterState === "todos"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Todos</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={filterState === "activo"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Activo</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="inactivo"
                    checked={filterState === "inactivo"}
                    onChange={handleFilterChange}
                  />
                  <span className="checkbox-custom">Inactivo</span>
                </label>
              </div>
              <div className="btn-student">
                <button className="add-btn" onClick={() => handleShow()}>
                  <FaPlus /> Agregar estudiante
                </button>
                <label htmlFor="import-excel" className="import-btn">
                  <FaFileExcel style={{ marginRight: "10px" }} /> Importar Excel
                </label>
                <input
                  type="file"
                  id="import-excel"
                  accept=".xlsx, .xls"
                  style={{ display: "none" }}
                  onChange={handleImportExcel}
                  disabled={isImporting}
                />
              </div>
            </div>
          </section>
          <section className="students-table-section">
            {showAlert && (
              <div className="custom-alert">
                <div className="alert-content">
                  <h4>¡Atención!</h4>
                  <p>{alertMessage}</p>
                  <button onClick={() => setShowAlert(false)}>Cerrar</button>
                </div>
              </div>
            )}
            {isImporting && (
              <div className="loading-overlay">
                <div className="loading-spinner">
                  <Spinner animation="border" variant="primary" />
                  <p>Procesando archivo Excel...</p>
                </div>
              </div>
            )}
            <div className="table-wrapper">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Dni</th>
                    <th className='club'>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStudents.length > 0 ? (
                    currentStudents.map((estudiante, index) => (
                      <tr
                        key={estudiante._id}
                        className={`state-${estudiante.state.toLowerCase()}`}
                      >
                        <td>{indexOfFirstStudent + index + 1}</td>
                        <td>{estudiante.name}</td>
                        <td>{estudiante.lastName}</td>
                        <td>{estudiante.dni}</td>
                        <td className='club'>{estudiante.state}</td>
                        <td className="action-buttons">
                          <button
                            className="action-btn-student"
                            onClick={() => handleViewDetail(estudiante._id)}
                            title="Ver Detalle"
                          >
                            <FaUserCircle />
                          </button>
                           <button
                            className="action-btn-student"
                            onClick={() => handleViewPayments(estudiante._id)}
                            title="Ver Pagos"
                          >
                            <FaMoneyBill />
                          </button>
                          <button
                            className="action-btn-student"
                            onClick={() => handleShow(estudiante)}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn-student"
                            onClick={() => handleDelete(estudiante._id)}
                            title="Eliminar"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-table-row">
                      <td colSpan="8" className="empty-table-message">
                        {searchTerm
                          ? `No se encontraron alumnos que coincidan con "${searchTerm}"`
                          : filterState !== "todos"
                            ? `No hay alumnos con estado "${filterState}"`
                            : "No hay alumnos registrados en el sistema"}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <button
                    key={number}
                    className={`pagination-btn ${currentPage === number ? "active" : ""}`
                    }
                    onClick={() => paginate(number)}
                  >
                    {number}
                  </button>
                )
              )}
              <button
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
                className="pagination-btn"
              >
                »
              </button>
            </div>
          </section>
          <StudentFormModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            formData={formData}
          />
        </main>
      </div>
    </div>
  );
};

export default Student;