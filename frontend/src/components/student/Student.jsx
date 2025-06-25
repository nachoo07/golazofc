import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {FaSearch, FaBars, FaList, FaTimes, FaUsers, FaClipboardList, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaArrowLeft, FaUserCircle,
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
  const { auth, logout, userData } = useContext(LoginContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [show, setShow] = useState(false);
  const profileRef = useRef(null);
  const [editStudent, setEditStudent] = useState(null);
  const [filterState, setFilterState] = useState("todos");
  const [formData, setFormData] = useState({
    name: "",lastName: "",dni: "",birthDate: "",address: "",mail: "",category: "",guardianName: "",guardianPhone: "",profileImage: null,state: "Activo",hasSiblingDiscount: false,});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImporting, setIsImporting] = useState(false);
  const studentsPerPage = 10;

  const tempState = useRef({
    currentPage: 1,
    searchTerm: "",
    filterState: "todos",
  });

  const menuItems = [
    { name: "Inicio", route: "/", icon: <FaHome />, category: "principal" },
    { name: "Alumnos", route: "/student", icon: <FaUsers />, category: "principal" },
    { name: "Cuotas", route: "/share", icon: <FaMoneyBill />, category: "finanzas" },
    { name: "Reportes", route: "/report", icon: <FaChartBar />, category: "informes" },
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
    const queryParams = new URLSearchParams(location.search);
    const page = parseInt(queryParams.get('page')) || 1;
    setCurrentPage(page);
    obtenerEstudiantes();

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
  }, [obtenerEstudiantes, location.search]);

  useEffect(() => {
    if (location.pathname !== "/student" && location.state?.fromStudent) {
      setCurrentPage(1);
      setSearchTerm("");
      setFilterState("todos");
    } else if (
      location.pathname === "/student" &&
      location.state?.fromDetail
    ) {
      setCurrentPage(tempState.current.currentPage);
      setSearchTerm(tempState.searchTerm);
      setFilterState(tempState.filterState);
    }
  }, [location]);

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
              rowNumber: index + 2, // Incluir el número de fila (comienza en 2)
            };
          });

          if (studentList.length === 0) {
            throw new Error('El archivo Excel no contiene datos válidos');
          }
          await importStudents(studentList);
        } catch (error) {
          console.error('Error al procesar el Excel:', error);
          setAlertMessage(error.message || 'Error al procesar el archivo Excel');
          setShowAlert(true);
        } finally {
          setIsImporting(false);
          e.target.value = '';
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error al importar:', error);
      setIsImporting(false);
      e.target.value = '';
    }
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
      const dateInputValue = student.birthDate || ''; // Mantener yyyy-MM-dd
      setFormData({
        ...student,
        birthDate: dateInputValue,
        dateInputValue,
        profileImage: student.profileImage,
        hasSiblingDiscount: student.hasSiblingDiscount || false,
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
        birthDate: value, // Mantener yyyy-MM-dd
        dateInputValue: value,
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar formato de imagen en el frontend
    if (formData.profileImage instanceof File) {
      const validImageTypes = ['image/jpeg','image/png','image/heic','image/heif','image/webp','image/gif',];
      if (!validImageTypes.includes(formData.profileImage.type)) {
        Swal.fire({
          title: '¡Error!',
          text: 'La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        return;
      }
      if (formData.profileImage.size > 5 * 1024 * 1024) { // 5MB
        Swal.fire({
          title: '¡Error!',
          text: 'La imagen de perfil no debe exceder los 5MB.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
        });
        return;
      }
    }

    const formattedData = {
      ...formData,
      birthDate: formData.dateInputValue,
    };

    try {
      if (editStudent) {
        await updateEstudiante(formattedData);
        Swal.fire({
          title: '¡Éxito!',
          text: 'El perfil del estudiante ha sido actualizado correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
      } else {
        await addEstudiante(formattedData);
        Swal.fire({
          title: '¡Éxito!',
          text: 'El estudiante ha sido agregado correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
      }
      setShow(false);
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      Swal.fire({
        title: '¡Error!',
        text: error.message || 'Ocurrió un problema al guardar el estudiante. Por favor, intenta de nuevo.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
    }
  };

  const handleDelete = async (studentId) => {
    try {
      await deleteEstudiante(studentId);
    } catch (error) {
      Swal.fire("Error", "Hubo un problema al eliminar el alumno.", "error");
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    logout();
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
    navigate(`/detailstudent/${studentId}?page=${currentPage}`);
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