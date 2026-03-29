import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaPlus, FaTimes as FaTimesClear, FaFileExcel } from "react-icons/fa";
import { FiUser, FiCreditCard, FiEdit3, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import { format, parse, isValid } from "date-fns";
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import StudentFormModal from "../modal/StudentFormModal";
import { showErrorAlert, showSuccessToast } from "../../utils/alerts/Alerts";
import { getFirstValidationMessage, isValidationErrorResponse, mapValidationErrors } from "../../utils/forms/validationErrors";
import "./student.css";
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import DesktopNavbar from '../navbar/DesktopNavbar';
import Sidebar from '../sidebar/Sidebar';
import Pagination from '../pagination/Pagination'
import * as XLSX from 'xlsx';

const Student = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { estudiantes, obtenerEstudiantes, addEstudiante, updateEstudiante, deleteEstudiante, importStudents, loading } = useContext(StudentsContext);
  const { auth, authReady } = useContext(LoginContext);
  const [searchTerm, setSearchTerm] = useState("");
  const [show, setShow] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [filterState, setFilterState] = useState("todos");
  const [formData, setFormData] = useState({
    name: "", lastName: "", dni: "", birthDate: "", address: "", mail: "", category: "", guardianName: "", guardianPhone: "", profileImage: null, state: "Activo", hasSiblingDiscount: false, sure: "", league: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isImporting, setIsImporting] = useState(false);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const studentsPerPage = 10;
  const FILTER_OPTIONS = ["todos", "activo", "inactivo"];

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
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
          navigate('/login');
        } else if (error.response?.status === 404) {
          showErrorAlert('!Error!', 'No se encontraron estudiantes.');
        } else {
          showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudieron cargar los estudiantes.');
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
      showErrorAlert('¡Error!', 'Por favor selecciona un archivo Excel.');
      return;
    }

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      showErrorAlert('¡Error!', 'El archivo debe ser un Excel (.xlsx).');
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
              sure: row['Seguro'] || 'Sin especificar',
              league: row['Liga'] || 'Sin especificar',
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

  const normalizeText = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const studentsCountByState = useMemo(() => {
    return estudiantes.reduce(
      (acc, estudiante) => {
        const normalizedState = normalizeText(estudiante.state);
        if (normalizedState === "activo") acc.activo += 1;
        if (normalizedState === "inactivo") acc.inactivo += 1;
        acc.todos += 1;
        return acc;
      },
      { todos: 0, activo: 0, inactivo: 0 }
    );
  }, [estudiantes]);

  const filteredStudents = useMemo(() => {
    const searchNormalized = normalizeText(searchTerm);

    return estudiantes.filter((estudiante) => {
      const nameNormalized = normalizeText(estudiante.name);
      const lastNameNormalized = normalizeText(estudiante.lastName);
      const fullName = `${nameNormalized} ${lastNameNormalized}`;
      const dniNormalized = normalizeText(estudiante.dni);

      const matchesSearch = fullName.includes(searchNormalized) || dniNormalized.includes(searchNormalized);
      const studentState = normalizeText(estudiante.state);
      const matchesState = filterState === "todos" || studentState === filterState;

      return matchesSearch && matchesState;
    });
  }, [estudiantes, searchTerm, filterState]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage) || 1;
  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleShow = (student = null) => {
    const normalizeOptionalChoice = (value) => (value === 'Si' || value === 'No' ? value : '');

    if (student) {
      setEditStudent(student);
      const dateInputValue = student.birthDate || '';
      setFormData({
        ...student,
        birthDate: dateInputValue,
        dateInputValue,
        profileImage: student.profileImage,
        hasSiblingDiscount: student.hasSiblingDiscount || false,
        sure: normalizeOptionalChoice(student.sure),
        league: normalizeOptionalChoice(student.league),
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
        sure: '',
        league: '',
      });
    }
    setFormErrors({});
    setShow(true);
  };

  const handleClose = () => {
    setShow(false);
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'dateInputValue') {
      setFormData({
        ...formData,
        birthDate: value,
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
    try {
      const normalizedSure = formData.sure === 'Si' || formData.sure === 'No' ? formData.sure : undefined;
      const normalizedLeague = formData.league === 'Si' || formData.league === 'No' ? formData.league : undefined;
      const { sure: _sure, league: _league, dateInputValue, ...restFormData } = formData;

      if (formData.profileImage instanceof File) {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif'];
        if (!validImageTypes.includes(formData.profileImage.type)) {
          showErrorAlert('¡Error!', 'La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.');
          return;
        }
        if (formData.profileImage.size > 5 * 1024 * 1024) {
          showErrorAlert('¡Error!', 'La imagen de perfil no debe exceder los 5MB.');
          return;
        }
      }

      const formattedData = {
        ...restFormData,
        birthDate: dateInputValue,
        ...(normalizedSure !== undefined ? { sure: normalizedSure } : {}),
        ...(normalizedLeague !== undefined ? { league: normalizedLeague } : {}),
      };

      let result;
      if (editStudent) {
        result = await updateEstudiante(formattedData);
        if (result.success) {
          showSuccessToast('El perfil del estudiante ha sido actualizado correctamente.');
        } else {
          throw new Error(result.message);
        }
      } else {
        result = await addEstudiante(formattedData);
        if (result.success) {
          showSuccessToast('El estudiante ha sido agregado correctamente.');
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
        navigate('/login');
      } else if (isValidationErrorResponse(error)) {
        const mappedErrors = mapValidationErrors(error);
        if (Object.keys(mappedErrors).length > 0) {
          setFormErrors(mappedErrors);
        } else {
          setFormErrors({ general: getFirstValidationMessage(error) || 'Los datos del estudiante son inválidos.' });
        }
      } else if (error.response?.status === 404) {
        showErrorAlert('¡Error!', 'Estudiante no encontrado.');
      } else {
        showErrorAlert('¡Error!', error.response?.data?.message || (editStudent ? 'No se pudo actualizar el estudiante.' : 'No se pudo agregar el estudiante.'));
      }
    }
  };

  const handleDelete = async (studentId) => {
    try {
      const result = await deleteEstudiante(studentId);
      if (result?.deleted) {
        showSuccessToast('El estudiante ha sido eliminado correctamente.');
      }
    } catch (error) {
      console.error('handleDelete: Error deleting student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudo eliminar el estudiante.');
      }
    }
  };

  const handleFilterChange = (nextFilter) => {
    if (!FILTER_OPTIONS.includes(nextFilter)) {
      return;
    }
    if (nextFilter !== filterState) {
      setFilterState(nextFilter);
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
          activeRoute="/student"
        />
        <main className="main-content">
          <div className="students-header">
            <div className={`students-search-container ${windowWidth <= 576 ? "mobile-search-container" : "desktop-search-container"}`}>
              <FaSearch className="mobile-search-icon" />
              <input
                type="text"
                placeholder={windowWidth <= 576 ? "Buscar alumnos..." : "Buscar por nombre, apellido o DNI..."}
                className="mobile-search-input"
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={loading}
              />
              {searchTerm && (
                <button
                  className="mobile-search-clear"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                >
                  <FaTimesClear />
                </button>
              )}
            </div>
            <div className="students-actions">
              <button className="add-btn-student" onClick={() => handleShow()} disabled={loading}>
                <FaPlus /> Agregar Alumno
              </button>
              <button className="add-btn-student" onClick={() => document.getElementById('excelInput').click()} disabled={loading || isImporting}>
                <FaFileExcel /> Importar Excel
              </button>
              <input
                type="file"
                id="excelInput"
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleImportExcel}
                disabled={loading || isImporting}
              />
            </div>
          </div>
          <section className="students-filter">
            <div className="filter-actions-student">
              <div className="checkbox-filters-student" role="tablist" aria-label="Filtro de estado de estudiantes">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-pill ${filterState === option ? "active" : ""}`}
                    onClick={() => handleFilterChange(option)}
                    aria-pressed={filterState === option}
                    disabled={loading}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                    <span className="filter-count">{studentsCountByState[option] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
          <section className="students-table-section">
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
                        <td className="action-cell">
                          <div className="action-buttons">
                            <button
                              className="action-btn-student"
                              onClick={() => handleViewDetail(estudiante._id)}
                              title="Ver Detalle"
                              disabled={loading}
                            >
                              <FiUser />
                            </button>
                            <button
                              className="action-btn-student "
                              onClick={() => handleViewPayments(estudiante._id)}
                              title="Ver Pagos"
                              disabled={loading}
                            >
                              <FiCreditCard />
                            </button>
                            <button
                              className="action-btn-student "
                              onClick={() => handleShow(estudiante)}
                              title="Editar"
                              disabled={loading}
                            >
                              <FiEdit3 />
                            </button>
                            <button
                              className="action-btn-student"
                              onClick={() => handleDelete(estudiante._id)}
                              title="Eliminar"
                              disabled={loading}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="empty-table-row">
                      <td colSpan="6" className="empty-table-message">
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={paginate}
              disabled={loading}
            />
          </section>
          <StudentFormModal
            show={show}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            formData={formData}
            formErrors={formErrors}
          />
        </main>
      </div>
    </div>
  );
};

export default Student;
