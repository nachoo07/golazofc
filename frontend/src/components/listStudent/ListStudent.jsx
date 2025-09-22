import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaDownload, FaList, FaFilePdf, FaBars, FaTimes, FaClipboardList, FaUserCircle, FaChevronDown, FaHome, FaUsers, FaMoneyBill, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope } from 'react-icons/fa';
import { StudentsContext } from '../../context/student/StudentContext';
import { PaymentContext } from '../../context/payment/PaymentContext';
import { LoginContext } from '../../context/login/LoginContext';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import AppNavbar from '../navbar/AppNavbar';
import './listStudent.css';
import logo from '../../assets/logo.png';

const ListStudent = () => {
  const navigate = useNavigate();
  const { estudiantes, loading: studentsLoading, obtenerEstudiantes } = useContext(StudentsContext); // Cambiado fetchStudents por obtenerEstudiantes
  const { payments, concepts, fetchConcepts, fetchAllPayments, fetchPaymentsByDateRange, loadingPayments } = useContext(PaymentContext);
  const { auth, logout, userData, waitForAuth } = useContext(LoginContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [conceptFilter, setConceptFilter] = useState('');
  const [optionFilter, setOptionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const profileRef = useRef(null);

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal' },
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
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
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth <= 576) setIsMenuOpen(false);
      else setIsMenuOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await waitForAuth(); // Esperar a que la autenticación esté lista
      if (auth === 'admin') {
        try {
          await obtenerEstudiantes(); // Cargar datos de alumnos
          await fetchConcepts();
          await fetchAllPayments();
        } catch (error) {
          Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        }
      }
    };
    loadData();
  }, [auth, obtenerEstudiantes, fetchConcepts, fetchAllPayments, waitForAuth]);

  useEffect(() => {
    setHasAppliedFilters(!!conceptFilter && !!startDate && !!endDate);
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, optionFilter, conceptFilter, startDate, endDate]);

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    if (startDate && newEndDate < startDate) {
      Swal.fire('¡Error!', 'La fecha de fin no puede ser anterior a la fecha de inicio.', 'error');
      return;
    }
    setEndDate(newEndDate);
    setCurrentPage(1);
  };

  const paymentsMap = useMemo(() => {
    const map = new Map();
    payments.forEach(p => {
      if (!map.has(p.studentId)) map.set(p.studentId, new Map());
      const conceptMap = map.get(p.studentId);
      const conceptLower = p.concept.toLowerCase();
      if (!conceptMap.has(conceptLower)) conceptMap.set(conceptLower, []);
      conceptMap.get(conceptLower).push(p);
    });

    const processedMap = new Map();
    map.forEach((conceptMap, studentId) => {
      processedMap.set(studentId, new Map());
      conceptMap.forEach((paymentList, concept) => {
        if (conceptFilter && startDate && endDate) {
          const filteredPayments = paymentList.filter(p => {
            const paymentDate = new Date(p.paymentDate);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return paymentDate >= start && paymentDate <= end;
          });
          const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);
          processedMap.get(studentId).set(concept, totalAmount || null);
        }
      });
    });

    return processedMap;
  }, [payments, conceptFilter, startDate, endDate]);

  const hasAnyPaymentForConcept = (studentId, conceptLower) => {
    const studentPayments = payments.filter(p => p.studentId === studentId && p.concept.toLowerCase() === conceptLower);
    return studentPayments.length > 0;
  };

  const processedStudents = useMemo(() => {
    if (!estudiantes || estudiantes.length === 0) return [];

    let filtered = [...estudiantes];

    // Filtro por búsqueda (nombre, apellido, DNI)
    if (searchTerm) {
      const searchNormalized = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      filtered = filtered.filter((student) => {
        const nameNormalized = `${student.name} ${student.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const dniSearch = student.dni?.toLowerCase().includes(searchNormalized);
        return nameNormalized.includes(searchNormalized) || dniSearch;
      });
    }

    // Filtro por categoría (año de nacimiento)
    if (categoryFilter) {
      filtered = filtered.filter((student) => new Date(student.birthDate).getFullYear() === parseInt(categoryFilter));
    }

    // Filtro por opción (Liga o Seguro)
    if (optionFilter) {
      filtered = filtered.filter((student) => {
        const statusValue = optionFilter === 'Liga' ? student.league : student.sure;
        const normalizedValue = String(statusValue || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return normalizedValue === 'si' || normalizedValue === 'true';
      });
    }

    // Filtro por concepto y rango de fechas
    if (conceptFilter && startDate && endDate) {
      const conceptLower = conceptFilter.toLowerCase();
      filtered = filtered.filter(s => {
        const studentPayments = paymentsMap.get(s._id);
        const hasPaymentInRange = studentPayments && studentPayments.has(conceptLower) && studentPayments.get(conceptLower) > 0;

        // Para el concepto "Arbitro", incluir todos los alumnos que juegan liga
        if (conceptLower === 'arbitro') {
          const isLeaguePlayer = String(s.league || '').toLowerCase() === 'si' || s.league === true;
          return isLeaguePlayer; // Incluir si juega liga, sin importar si tiene pagos
        }

        // Para "Liga" o "Seguro", incluir alumnos con pagos o sin pagos pero relevantes
        if (conceptLower === 'liga' || conceptLower === 'seguro') {
          const hasNoPayments = !hasAnyPaymentForConcept(s._id, conceptLower);
          const isRelevant = conceptLower === 'liga' ? 
            (String(s.league || '').toLowerCase() === 'si' || s.league === true) :
            (String(s.sure || '').toLowerCase() === 'si' || s.sure === true);
          return hasPaymentInRange || (hasNoPayments && isRelevant);
        }

        // Para otros conceptos, incluir alumnos con pagos o sin pagos
        const hasNoPayments = !hasAnyPaymentForConcept(s._id, conceptLower);
        return hasPaymentInRange || hasNoPayments;
      });
    } else {
      return [];
    }

    return filtered.map(student => {
      let montoConcepto = 'Pendiente';
      if (conceptFilter) {
        const studentPayments = paymentsMap.get(student._id);
        const totalAmount = studentPayments ? studentPayments.get(conceptFilter.toLowerCase()) : null;
        if (totalAmount > 0) {
          montoConcepto = totalAmount;
        }
      }
      let statusValue = optionFilter === 'Liga' ? student.league : student.sure;
      return { ...student, montoConcepto, statusValue };
    });
  }, [estudiantes, searchTerm, categoryFilter, optionFilter, conceptFilter, startDate, endDate, paymentsMap]);

  const totalPages = Math.ceil(processedStudents.length / itemsPerPage);
  const paginatedStudents = processedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const normalizeStatus = (value) => {
    if (value === undefined || value === null || value === '') return 'No especificado';
    const normalizedValue = String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedValue === 'si' || normalizedValue === 'true') return 'Sí';
    if (normalizedValue === 'no' || normalizedValue === 'false') return 'No';
    return 'No especificado';
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDownloadExcel = () => {
    if (processedStudents.length === 0 || !hasAppliedFilters) return;

    const headers = ['Nombre Completo', 'DNI', 'Fecha de Nacimiento'];
    if (optionFilter) headers.push(optionFilter);
    if (conceptFilter) headers.push('Concepto', `Monto ${conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}`);

    const data = processedStudents.map(student => {
      const row = [
        `${student.name} ${student.lastName}`,
        student.dni,
        formatDate(student.birthDate),
      ];
      if (optionFilter) row.push(normalizeStatus(student.statusValue));
      if (conceptFilter) {
        row.push(conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1));
        row.push(student.montoConcepto === 'Pendiente' ? 'Pendiente' : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`);
      }
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const headerStyle = {
      font: { name: 'Arial', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'e31fa8' }, patternType: 'solid' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    const cellStyle = {
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
      font: { name: 'Arial', sz: 12 },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    };

    headers.forEach((_, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
      ws[cellRef].s = headerStyle;
    });

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) continue;
        ws[cellRef].s = cellStyle;
        if (conceptFilter && col === headers.indexOf(`Monto ${conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}`)) {
          ws[cellRef].z = ws[cellRef].v === 'Pendiente' ? undefined : '$#,##0';
        }
      }
    }

    ws['!cols'] = [
      { wch: 40 }, // Nombre Completo
      { wch: 20 }, // DNI
      { wch: 35 }, // Fecha de Nacimiento
      ...(optionFilter ? [{ wch: 15 }] : []),
      ...(conceptFilter ? [{ wch: 30 }, { wch: 20 }] : []),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos_Pagos');
    const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all';
    XLSX.writeFile(wb, `Lista_Alumnos_Pagos_${dateRange}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (processedStudents.length === 0 || !hasAppliedFilters) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Lista de Alumnos con Pagos', 14, 20);

    const headers = ['#', 'Nombre Completo', 'DNI', 'Fecha de Nacimiento'];
    if (optionFilter) headers.push(optionFilter);
    if (conceptFilter) headers.push('Concepto', `Monto ${conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}`);

    const data = processedStudents.map((student, index) => {
      const row = [
        index + 1,
        `${student.name} ${student.lastName}`,
        student.dni,
        formatDate(student.birthDate),
      ];
      if (optionFilter) row.push(normalizeStatus(student.statusValue));
      if (conceptFilter) {
        row.push(conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1));
        row.push(student.montoConcepto === 'Pendiente' ? 'Pendiente' : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`);
      }
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 30,
      margin: { top: 20 },
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: {
        fillColor: [227, 31, 168],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      tableWidth: 'auto',
    });

    const dateRange = startDate && endDate ? `${startDate}_to_${endDate}` : 'all';
    doc.save(`Lista_Alumnos_Pagos_${dateRange}.pdf`);
  };

  const handleLogout = async () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const uniqueBirthYears = [...new Set(estudiantes.map(s => new Date(s.birthDate).getFullYear()))].sort((a, b) => b - a);

  const getEmptyMessage = () => {
    if (!conceptFilter) return 'Por favor, selecciona un concepto para ver los resultados.';
    if (!startDate || !endDate) return 'Por favor, selecciona un rango de fechas.';
    if (conceptFilter.toLowerCase() === 'arbitro') {
      return 'No hay alumnos que jueguen liga con los filtros seleccionados para el concepto Árbitro.';
    }
    if (optionFilter === 'Liga') return 'No hay alumnos que jueguen liga con los filtros seleccionados.';
    if (optionFilter === 'Seguro') return 'No hay alumnos con seguro con los filtros seleccionados.';
    return 'No se encontraron alumnos con pagos o pendientes para el concepto y rango de fechas seleccionados.';
  };

  if (studentsLoading || loadingPayments) {
    return <div className="loading">Cargando datos...</div>;
  }

  if (auth !== 'admin') {
    return <div className="error-message">No tienes permisos para ver esta lista.</div>;
  }

  return (
    <div className={`app-container ${windowWidth <= 576 ? 'mobile-view' : ''}`}>
      {windowWidth <= 576 && <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />}
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
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="nav-right-section">
            <div className="profile-container" ref={profileRef} onClick={() => setIsProfileOpen(!isProfileOpen)}>
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
                  <div className="menu-option logout-option" onClick={(e) => { e.stopPropagation(); handleLogout(); setIsProfileOpen(false); }}>
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
                    className={`sidebar-menu-item ${item.route === '/liststudent' ? 'active' : ''}`}
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
          <section className="dashboard-welcome">
            <div className="welcome-text">
              <h1>Lista de Alumnos con Pagos</h1>
              {hasAppliedFilters && <p>Total filtrados: {processedStudents.length}</p>}
            </div>
          </section>
          <section className="students-filter">
            <div className="filter-action-list">
              <div className="filter-group-search">
                <label><FaSearch /> Buscar:</label>
                <input
                  type="text"
                  placeholder="Nombre, apellido o DNI..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="filter-input"
                />
              </div>
              <div className="download-actions">
                <button className="download-btn" onClick={handleDownloadExcel} disabled={processedStudents.length === 0 || !hasAppliedFilters}>
                  <FaDownload /> Descargar Excel
                </button>
                <button className="download-btn pdf-btn" onClick={handleDownloadPDF} disabled={processedStudents.length === 0 || !hasAppliedFilters}>
                  <FaFilePdf /> Descargar PDF
                </button>
              </div>
            </div>
          </section>
          <section className="students-filter">
            <div className="filter-actions list">
              <div className="filter-group">
                <label>Categoría:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="filter-select-list"
                >
                  <option value="">Seleccionar Categoría</option>
                  {uniqueBirthYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Opción:</label>
                <select
                  value={optionFilter}
                  onChange={(e) => { setOptionFilter(e.target.value); setCurrentPage(1); }}
                  className="filter-select-list"
                >
                  <option value="">Seleccionar Opción</option>
                  <option value="Liga">Liga</option>
                  <option value="Seguro">Seguro</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Concepto:</label>
                <select
                  value={conceptFilter}
                  onChange={(e) => { setConceptFilter(e.target.value); setCurrentPage(1); }}
                  className="filter-select-list"
                  title="Selecciona un concepto para habilitar los filtros de fecha"
                >
                  <option value="">Seleccionar Concepto</option>
                  {concepts.map((concept) => (
                    <option key={concept._id} value={concept.name}>
                      {concept.name.charAt(0).toUpperCase() + concept.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {conceptFilter && (
                <>
                  <div className="filter-group">
                    <label>Fecha Inicio:</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                      className="filter-input"
                      required
                    />
                  </div>
                  <div className="filter-group">
                    <label>Fecha Fin:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className="filter-input"
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </section>
          {hasAppliedFilters && (
            <section className="students-table-payment animate-fade-in">
              <div className="table-wrapper">
                <table className="students-payment">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre Completo</th>
                      <th>DNI</th>
                      <th>Fecha de Nacimiento</th>
                      {optionFilter && <th>{optionFilter}</th>}
                      {conceptFilter && (
                        <>
                          <th>Concepto</th>
                          <th>Monto</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((student, index) => (
                        <tr key={student._id}>
                          <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td>{`${student.name} ${student.lastName}`}</td>
                          <td>{student.dni}</td>
                          <td>{formatDate(student.birthDate)}</td>
                          {optionFilter && (
                            <td>{normalizeStatus(student.statusValue)}</td>
                          )}
                          {conceptFilter && (
                            <>
                              <td>{conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}</td>
                              <td>
                                {student.montoConcepto === 'Pendiente' 
                                  ? 'Pendiente' 
                                  : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`}
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={conceptFilter ? (optionFilter ? 7 : 5) : (optionFilter ? 5 : 4)} className="empty-table-message">
                          {getEmptyMessage()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Anterior</button>
                  <span>Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Siguiente</button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default ListStudent;