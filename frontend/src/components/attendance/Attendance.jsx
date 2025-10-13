import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AttendanceContext } from '../../context/attendance/AttendanceContext';
import { StudentsContext } from '../../context/student/StudentContext';
import { LoginContext } from '../../context/login/LoginContext';
import Swal from 'sweetalert2';
import {
  FaBars, FaUsers, FaMoneyBill, FaExchangeAlt, FaList,
  FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome,
  FaUserCircle, FaChevronDown, FaTimes, FaClipboardList, FaSearch,
  FaFileExport
} from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import { format, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Modal, Button, Form } from 'react-bootstrap';
import 'react-datepicker/dist/react-datepicker.css';
import './attendance.css';
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { es } from 'date-fns/locale';

const Attendance = () => {
  // Inicializar fechas como objetos Date en la zona horaria local
  const getLocalDate = (date = new Date()) => new Date(date); // Mantener la fecha y hora actuales

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [previousAttendance, setPreviousAttendance] = useState({});
  const [isAttendanceSaved, setIsAttendanceSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(getLocalDate(startOfMonth(new Date())));
  const [reportEndDate, setReportEndDate] = useState(getLocalDate(endOfMonth(new Date())));
  const [reportFormat, setReportFormat] = useState('excel');
  const [reportError, setReportError] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchTerm, setSearchTerm] = useState('');
  const profileRef = useRef(null);
  const modalRef = useRef(null);
  const navigate = useNavigate();
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { auth, logout, userData } = useContext(LoginContext);
  const { agregarAsistencia, actualizarAsistencia, ObtenerAsistencia, asistencias } = useContext(AttendanceContext);

  const categories = Array.from({ length: 2020 - 2012 + 1 }, (_, i) => String(2012 + i));

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal' },
    ...(auth === 'admin' ? [
      { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
      { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
      { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas' },
      { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' },
      { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion' },
      { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion' },
      { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion' },
      { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
      { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas' }
    ] : [
      { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' }
    ])
  ];

  // useEffects
  useEffect(() => {
    if (auth === 'admin' || auth === 'user') {
      obtenerEstudiantes();
    }
  }, [auth, obtenerEstudiantes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (
        modalRef.current &&
        typeof modalRef.current.contains === 'function' &&
        !modalRef.current.contains(event.target)
      ) {
        setIsReportModalOpen(false);
        setReportError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      setIsMenuOpen(newWidth > 576);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const studentsArray = Array.isArray(estudiantes) ? estudiantes : [];
      const filteredByCategory = studentsArray.filter(student => student.category === selectedCategory);
      const filteredBySearch = filteredByCategory.filter(student => {
        const searchNormalized = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nameNormalized = student.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const lastNameNormalized = student.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const fullName = `${nameNormalized} ${lastNameNormalized}`;
        return fullName.includes(searchNormalized);
      });
      setFilteredStudents(filteredBySearch);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedCategory, estudiantes, searchTerm]);

  useEffect(() => {
    if (selectedCategory && selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd'); // Usar fecha local sin hora
      const asistenciaExistente = asistencias.find(asistencia => {
        const asistenciaDate = new Date(asistencia.date);
        const formattedAsistenciaDate = isValid(asistenciaDate) ? format(asistenciaDate, 'yyyy-MM-dd') : null;
        if (!formattedAsistenciaDate) return false;
        const studentIds = Array.isArray(asistencia.attendance) ? asistencia.attendance.map(a => a.idStudent) : [];
        const relevantStudents = estudiantes.filter(student => studentIds.includes(student._id) && student.category === selectedCategory);
        return formattedAsistenciaDate === formattedDate && relevantStudents.length > 0;
      });
      if (asistenciaExistente) {
        const newAttendance = {};
        if (Array.isArray(asistenciaExistente.attendance)) {
          asistenciaExistente.attendance.forEach(student => {
            newAttendance[student.idStudent] = student.present ? 'present' : 'absent';
          });
        }
        setAttendance(newAttendance);
        setIsAttendanceSaved(true);
        setIsEditing(false);
      } else {
        const newAttendance = {};
        const studentsInCategory = estudiantes.filter(student => student.category === selectedCategory);
        studentsInCategory.forEach(student => {
          newAttendance[student._id] = null;
        });
        setAttendance(newAttendance);
        setIsAttendanceSaved(false);
        setIsEditing(false);
      }
    }
  }, [selectedCategory, selectedDate, asistencias, estudiantes]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prevState => {
      const newState = { ...prevState };
      const currentStatus = prevState[studentId];

      if (status === currentStatus) {
        return prevState;
      }

      if (status === 'present') {
        newState[studentId] = 'present';
      } else if (status === 'absent') {
        newState[studentId] = 'absent';
      }

      if (newState[studentId] === 'present' && currentStatus === 'absent') {
      } else if (newState[studentId] === 'absent' && currentStatus === 'present') {
      } else if (newState[studentId]) {
        if (currentStatus === 'present') {
          newState[studentId] = 'absent';
        } else if (currentStatus === 'absent') {
          newState[studentId] = 'present';
        } else {
          newState[studentId] = status;
        }
      }

      return newState;
    });
  };

  const handleAttendanceSubmit = async () => {
    if (!filteredStudents.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin estudiantes',
        text: 'No hay estudiantes seleccionados para registrar la asistencia.',
      });
      return;
    }
    if (!selectedDate || isNaN(new Date(selectedDate).getTime())) {
      Swal.fire({
        icon: 'warning',
        title: 'Fecha inválida',
        text: 'Por favor, selecciona una fecha válida.',
      });
      return;
    }
    if (!selectedCategory) {
      Swal.fire({
        icon: 'warning',
        title: 'Categoría requerida',
        text: 'Por favor, selecciona una categoría.',
      });
      return;
    }
    const validStudents = filteredStudents.filter(student => student._id && typeof student._id === 'string' && student.name && student.lastName);
    if (!validStudents.length) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'No hay estudiantes con datos completos para registrar la asistencia.',
      });
      return;
    }

    const modifiedAttendance = validStudents
      .map(student => {
        const currentStatus = attendance[student._id];
        if (currentStatus) {
          const asistenciaExistente = asistencias.find(a => {
            const asistenciaDate = new Date(a.date);
            return format(asistenciaDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
              a.category === selectedCategory;
          })?.attendance.find(att => att.idStudent === student._id);

          const wasModified = !asistenciaExistente ||
            asistenciaExistente.present !== (currentStatus === 'present');
          if (wasModified) {
            return {
              idStudent: student._id,
              name: student.name,
              lastName: student.lastName,
              present: currentStatus === 'present',
              createdBy: userData?.name || localStorage.getItem('authName') || 'No Registrado'
            };
          }
        }
        return null;
      })
      .filter(att => att !== null);

    if (modifiedAttendance.length === 0 && !isAttendanceSaved) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin cambios',
        text: 'No se detectaron modificaciones para guardar.',
      });
      return;
    }

    const attendanceData = {
      date: selectedDate.toISOString(), // Enviar en UTC, pero la fecha será correcta por el ajuste local
      category: selectedCategory,
      attendance: modifiedAttendance
    };

    try {
      if (isAttendanceSaved) {
        await actualizarAsistencia(attendanceData);
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'Asistencia actualizada exitosamente.',
        });
      } else {
        await agregarAsistencia(attendanceData);
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Asistencia guardada exitosamente.',
        });
      }
      await ObtenerAsistencia();
      setIsAttendanceSaved(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar la asistencia:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la asistencia. Por favor, intenta de nuevo.',
      });
    }
  };

  const handleEditAttendance = () => {
    setPreviousAttendance({ ...attendance });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setAttendance(previousAttendance);
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  const generateReport = () => {
  setReportError(null);

  if (!selectedCategory) {
    setReportError('Por favor, selecciona una categoría.');
    return;
  }
  if (!reportStartDate || !reportEndDate || reportStartDate > reportEndDate) {
    setReportError('Por favor, selecciona un rango de fechas válido.');
    return;
  }

  const startUTC = startOfDay(reportStartDate);
  const endUTC = endOfDay(reportEndDate);

  // Filtrar asistencias válidas
  const filteredAsistencias = asistencias.filter(asistencia => {
    const asistenciaDate = new Date(asistencia.date);
    if (!isValid(asistenciaDate) || asistenciaDate < startUTC || asistenciaDate > endUTC) {
      console.warn(`Fecha inválida o fuera de rango: ${asistencia.date}`, asistencia);
      return false;
    }
    const hasCategory = asistencia.attendance.some(studentAttendance => {
      const student = estudiantes.find(st => st._id === studentAttendance.idStudent);
      return student && student.category === selectedCategory;
    });
    return hasCategory;
  });

  // Obtener fechas únicas con formato dd/MM
  const attendanceDates = [
    ...new Set(
      filteredAsistencias.map(asistencia => {
        const asistenciaDate = new Date(asistencia.date);
        return isValid(asistenciaDate) ? format(asistenciaDate, 'dd/MM') : null;
      }).filter(date => date !== null)
    ),
  ].sort();

  if (!attendanceDates.length) {
    setReportError('No hay datos de asistencia para el rango de fechas seleccionadas en esta categoría.');
    return;
  }

  const reportData = [];
  const studentsWithAttendance = {};

  filteredAsistencias.forEach(asistencia => {
    const asistenciaDate = new Date(asistencia.date);
    if (!isValid(asistenciaDate)) return;
    const dateKey = format(asistenciaDate, 'dd/MM/yyyy'); // Clave interna con año
    asistencia.attendance.forEach(studentAttendance => {
      const student = estudiantes.find(st => st._id === studentAttendance.idStudent);
      if (student && student.category === selectedCategory) {
        const studentId = student._id;
        if (!studentsWithAttendance[studentId]) {
          studentsWithAttendance[studentId] = {
            name: student.name,
            lastName: student.lastName,
            category: selectedCategory
          };
        }
        studentsWithAttendance[studentId][dateKey] = studentAttendance.present ? 'P' : 'A';
      }
    });
  });

  Object.values(studentsWithAttendance).forEach(studentData => {
    const row = {
      'Nombre completo': `${studentData.name} ${studentData.lastName}`,
      Categoría: studentData.category
    };
    attendanceDates.forEach(date => {
      // Buscar la fecha completa que comience con el día/mes
      const fullDateKey = Object.keys(studentData).find(key =>
        key && key.startsWith(date)
      );
      row[date] = fullDateKey ? studentData[fullDateKey] || '' : '';
    });
    reportData.push(row);
  });

  if (!reportData.length) {
    setReportError('No hay datos de asistencia para el rango de fechas seleccionadas en esta categoría.');
    return;
  }

  if (reportFormat === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia');
    XLSX.writeFile(workbook, `Reporte_Asistencia_${selectedCategory}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  } else {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Reporte de Asistencia', 20, 10);
    doc.setFontSize(12);
    doc.text(`Categoría: ${selectedCategory}`, 20, 20);
    doc.text(`Rango: ${format(reportStartDate, 'dd/MM/yyyy')} - ${format(reportEndDate, 'dd/MM/yyyy')}`, 20, 30);
    const headers = [
      'Nombre completo',
      'Categoría',
      ...attendanceDates // Usar solo dd/MM
    ];
    const data = reportData.map(row => [
      row['Nombre completo'],
      row['Categoría'],
      ...attendanceDates.map(date => {
        const fullDateKey = Object.keys(row).find(key => key && key.startsWith(date));
        return fullDateKey ? row[fullDateKey] || '' : '';
      })
    ]);
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 40,
      styles: { fontSize: 12, cellPadding: 2 },
      headStyles: { fillColor: [227, 31, 168] }
    });
    doc.save(`ReporteAsistencia_${selectedCategory}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
  setIsReportModalOpen(false);
  setReportError(null);
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
            <div className="profile-container" ref={profileRef} onClick={() => setIsProfileOpen(prev => !prev)}>
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">Hola, {userData?.name || 'Usuario'}</span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? 'rotated' : ''}`} />
              {isProfileOpen && (
                <div className="profile-menu">
                  <div className="menu-option" onClick={(e) => { e.stopPropagation(); navigate('/user'); setIsProfileOpen(false); }}>
                    <FaUserCog className="option-icon" /> Mi Perfil
                  </div>
                  <div className="menu-option" onClick={(e) => { e.stopPropagation(); navigate('/settings'); setIsProfileOpen(false); }}>
                    <FaCog className="option-icon" /> Configuración
                  </div>
                  <div className="menu-separator"></div>
                  <div className="menu-option logout-option" onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
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
              <button className="menu-toggle" onClick={toggleMenu}>
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`sidebar-menu-item ${item.route === '/attendance' ? 'active' : ''}`}
                    onClick={() => navigate(item.route)}
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
              <h1>Registro de Asistencia</h1>
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
                  <button className="mobile-search-clear" onClick={() => setSearchTerm('')}>
                    <FaTimes />
                  </button>
                )}
              </div>
            </section>
          )}
          <section className="category-selection">
            <div className="category-grid">
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
          {selectedCategory && (
            <>
              <div className="attendance-header">
                <div className="attendance-date-picker">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(new Date(date))}
                    maxDate={new Date()} // Permitir hasta el día actual
                    dateFormat="dd/MM/yyyy"
                    className="attendance-date-input"
                    locale={es}
                    dropdownMode="select"
                    showTimeSelect={false}
                  />
                </div>
                <div className="attendance-search-container">
                  <button className="attendance-today-btn" onClick={() => setSelectedDate(new Date())}>
                    Hoy
                  </button>
                  <button className="attendance-report-btn" onClick={handleOpenReportModal} title="Generar reporte de asistencia">
                    <FaFileExport /> <span className="report-text">Generar Reporte</span>
                  </button>
                </div>
              </div>
              {filteredStudents.length > 0 ? (
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Nombre y Apellido</th>
                      <th>Presente</th>
                      <th>Ausente</th>
                      <th>Creado/Modificado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const attendanceRecord = asistencias.find(a => {
                        const asistenciaDate = new Date(a.date);
                        return (
                          format(asistenciaDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
                          Array.isArray(a.attendance) &&
                          a.attendance.some(att => att.idStudent === student._id)
                        );
                      });
                      const createdBy = attendanceRecord?.attendance.find(att => att.idStudent === student._id)?.createdBy || 'No Registrado';
                      return (
                        <tr key={student._id}>
                          <td>{student.name} {student.lastName}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={attendance[student._id] === 'present'}
                              onChange={() => handleAttendanceChange(student._id, 'present')}
                              disabled={isAttendanceSaved && !isEditing}
                              className={isAttendanceSaved && !isEditing ? 'disabled-checkbox' : 'activated-checkbox'}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={attendance[student._id] === 'absent'}
                              onChange={() => handleAttendanceChange(student._id, 'absent')}
                              disabled={isAttendanceSaved && !isEditing}
                              className={isAttendanceSaved && !isEditing ? 'disabled-checkbox' : 'activated-checkbox'}
                            />
                          </td>
                          <td>{createdBy}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="no-students-message">
                  <p>No hay alumnos registrados en la categoría {selectedCategory}</p>
                </div>
              )}
              {filteredStudents.length > 0 && (
                <div className="attendance-buttons">
                  {!isAttendanceSaved && (
                    <button className="attendance-save-btn" onClick={handleAttendanceSubmit}>
                      Guardar Asistencia
                    </button>
                  )}
                  {isAttendanceSaved && !isEditing && (
                    <button className="attendance-edit-btn" onClick={handleEditAttendance}>
                      Editar Asistencia
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button className="attendance-update-btn" onClick={handleAttendanceSubmit}>
                        Actualizar Asistencia
                      </button>
                      <button className="attendance-cancel-btn" onClick={handleCancelEdit}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          <Modal show={isReportModalOpen} className="modal-attendance" onHide={() => { setIsReportModalOpen(false); setReportError(null); }} centered ref={modalRef}>
            <Modal.Header closeButton className="modal-header-attendance">
              <Modal.Title>Generar Reporte de Asistencia</Modal.Title>
            </Modal.Header>
            <Modal.Body className="modal-body-attendance">
              {reportError && <div className="alert alert-danger">{reportError}</div>}
              <Form>
                <div className="report-date-selection"> 

                
                <Form.Group controlId="reportStartDate" className="report-date-group">
                  <Form.Label>Fecha Inicial</Form.Label>
                  <DatePicker
                    selected={reportStartDate}
                    onChange={(date) => setReportStartDate(new Date(date))}
                    maxDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                    locale={es}
                    dropdownMode="select"
                    showTimeSelect={false}
                  />
                </Form.Group>
                <Form.Group controlId="reportEndDate" className="report-date-group">
                  <Form.Label>Fecha Final</Form.Label>
                  <DatePicker
                    selected={reportEndDate}
                    onChange={(date) => setReportEndDate(new Date(date))}
                    maxDate={new Date()}
                    minDate={reportStartDate}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                    locale={es}
                    dropdownMode="select"
                    showTimeSelect={false}
                  />
                </Form.Group>
                </div>
                <Form.Group controlId="reportFormat" className="report-format-group">
                  <Form.Label className="format">Formato:</Form.Label>
                  <Form.Select value={reportFormat} onChange={(e) => setReportFormat(e.target.value)}>
                    <option value="excel">Excel</option>
                    <option value="pdf">PDF</option>
                  </Form.Select>
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer className="modal-footer-attendance">
              <Button className="btn-modal-cancelar" onClick={() => { setIsReportModalOpen(false); setReportError(null); }}>
                Cancelar
              </Button>
              <Button className="btn-modal-guardar" onClick={generateReport}>
                Generar
              </Button>
            </Modal.Footer>
          </Modal>
        </main>
      </div>
    </div>
  );
};

export default Attendance;