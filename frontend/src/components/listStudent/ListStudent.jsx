import React, { useState, useContext, useEffect, useMemo } from 'react';
import { FaDownload, FaFilePdf } from 'react-icons/fa';
import { StudentsContext } from '../../context/student/StudentContext';
import { PaymentContext } from '../../context/payment/PaymentContext';
import { LoginContext } from '../../context/login/LoginContext';
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AppNavbar from '../navbar/AppNavbar';
import './listStudent.css';
import logo from '../../assets/logo.png';
import DesktopNavbar from '../navbar/DesktopNavbar';
import Sidebar from '../sidebar/Sidebar';
import Pagination from '../pagination/Pagination';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getSemesterRange = (year, semester) => {
  const parsedYear = Number(year);
  const parsedSemester = Number(semester);
  if (!parsedYear || !parsedSemester) return null;

  if (parsedSemester === 1) {
    return {
      start: new Date(parsedYear, 0, 1, 0, 0, 0, 0),
      end: new Date(parsedYear, 5, 30, 23, 59, 59, 999)
    };
  }

  if (parsedSemester === 2) {
    return {
      start: new Date(parsedYear, 6, 1, 0, 0, 0, 0),
      end: new Date(parsedYear, 11, 31, 23, 59, 59, 999)
    };
  }
  return null;
};

const ListStudent = () => {
  const { estudiantes, loading: studentsLoading, obtenerEstudiantes } = useContext(StudentsContext);
  const { payments, concepts, fetchConcepts, fetchAllPayments, loadingPayments } = useContext(PaymentContext);
  const { auth, authReady } = useContext(LoginContext);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('');
  const [sureFilter, setSureFilter] = useState('');
  const [conceptFilter, setConceptFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('pagados');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    if (auth === 'admin' && authReady) {
      obtenerEstudiantes();
      fetchConcepts();
      fetchAllPayments();
    }
  }, [auth, authReady, obtenerEstudiantes, fetchConcepts, fetchAllPayments]);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!categoryFilter) {
      setLeagueFilter('');
      setConceptFilter('');
      setSelectedYear('');
      setSelectedSemester('');
      setPaymentStatusFilter('pagados');
    }

    if (!conceptFilter) {
      setSelectedYear('');
      setSelectedSemester('');
      setPaymentStatusFilter('pagados');
    }
    setCurrentPage(1);
  }, [categoryFilter, leagueFilter, conceptFilter, selectedYear, selectedSemester, paymentStatusFilter]);

  const handleResetFilters = () => {
    setCategoryFilter('');
    setLeagueFilter('');
    setConceptFilter('');
    setSelectedYear('');
    setSelectedSemester('');
    setPaymentStatusFilter('pagados');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const paymentsInRangeMap = useMemo(() => {
    const map = new Map();
    if (!conceptFilter || !selectedYear || !selectedSemester) return map;

    const conceptLower = normalizeText(conceptFilter);
    const range = getSemesterRange(selectedYear, selectedSemester);
    const start = range?.start;
    const end = range?.end;
    if (!start || !end) return map;

    payments.forEach((payment) => {
      if (normalizeText(payment.concept) !== conceptLower) return;
      const paymentDate = new Date(payment.paymentDate);
      if (Number.isNaN(paymentDate.getTime())) return;
      if (paymentDate < start || paymentDate > end) return;

      map.set(payment.studentId, (map.get(payment.studentId) || 0) + Number(payment.amount || 0));
    });

    return map;
  }, [payments, conceptFilter, selectedYear, selectedSemester]);

  const availablePaymentYears = useMemo(() => {
    const filteredByConcept = conceptFilter
      ? payments.filter((payment) => normalizeText(payment.concept) === normalizeText(conceptFilter))
      : payments;

    const years = [...new Set(
      filteredByConcept
        .map((payment) => {
          const paymentDate = new Date(payment.paymentDate);
          return Number.isNaN(paymentDate.getTime()) ? null : paymentDate.getFullYear();
        })
        .filter(Boolean)
    )].sort((a, b) => b - a);

    return years;
  }, [payments, conceptFilter]);

  const availableSemestersForSelectedYear = useMemo(() => {
    if (!conceptFilter || !selectedYear) return [];

    const conceptNormalized = normalizeText(conceptFilter);
    const yearNumber = Number(selectedYear);
    const semesterSet = new Set();

    payments.forEach((payment) => {
      if (normalizeText(payment.concept) !== conceptNormalized) return;

      const paymentDate = new Date(payment.paymentDate);
      if (Number.isNaN(paymentDate.getTime())) return;
      if (paymentDate.getFullYear() !== yearNumber) return;

      const semester = paymentDate.getMonth() <= 5 ? 1 : 2;
      semesterSet.add(semester);
    });

    return [...semesterSet].sort((a, b) => a - b);
  }, [payments, conceptFilter, selectedYear]);

  useEffect(() => {
    if (!selectedSemester) return;
    const semesterNumber = Number(selectedSemester);
    if (!availableSemestersForSelectedYear.includes(semesterNumber)) {
      setSelectedSemester('');
    }
  }, [availableSemestersForSelectedYear, selectedSemester]);

  const getLeagueDisplay = (league) => {
    const leagueNorm = String(league || '').toLowerCase();
    if (leagueNorm === 'si' || leagueNorm === 'true') return 'Sí';
    if (leagueNorm === 'no' || leagueNorm === 'false') return 'No';
    return 'No especificado';
  };

  const getSureDisplay = (sure) => {
    const sureNorm = String(sure || '').toLowerCase();
    if (sureNorm === 'si' || sureNorm === 'true') return 'Sí';
    if (sureNorm === 'no' || sureNorm === 'false') return 'No';
    return 'No especificado';
  };

  const getLeagueStatus = (league) => {
    const leagueNorm = String(league || '').toLowerCase();
    if (leagueNorm === 'si' || leagueNorm === 'sí' || leagueNorm === 'true') return 'si';
    if (leagueNorm === 'no' || leagueNorm === 'false') return 'no';
    return 'no-especificado';
  };

  const processedStudents = useMemo(() => {
    if (!estudiantes || estudiantes.length === 0) return [];

    let filtered = [...estudiantes.filter((student) => student.state === 'Activo')]; // Excluir inactivos

    if (searchTerm.trim()) {
      const searchNormalized = normalizeText(searchTerm);
      filtered = filtered.filter((student) => {
        const fullName = normalizeText(`${student.name} ${student.lastName}`);
        const dni = normalizeText(student.dni);
        return fullName.includes(searchNormalized) || dni.includes(searchNormalized);
      });
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter((student) => new Date(student.birthDate).getFullYear() === parseInt(categoryFilter));
    }

    if (leagueFilter && leagueFilter !== 'all') {
      filtered = filtered.filter((student) => {
        const status = getLeagueStatus(student.league);
        if (leagueFilter === 'No especificado') return status === 'no-especificado';
        if (leagueFilter === 'Sí') return status === 'si';
        if (leagueFilter === 'No') return status === 'no';
        return false;
      });
    }

    if (conceptFilter && selectedYear && selectedSemester) {
      filtered = filtered.filter(s => {
        const hasPaymentInRange = (paymentsInRangeMap.get(s._id) || 0) > 0;

        if (paymentStatusFilter === 'pendientes') return !hasPaymentInRange;
        if (paymentStatusFilter === 'todos') return true;
        return hasPaymentInRange;
      });
    }

    return filtered.map(student => {
      let montoConcepto = 'Pendiente';
      if (conceptFilter && selectedYear && selectedSemester) {
        const totalAmount = paymentsInRangeMap.get(student._id) || null;
        if (totalAmount > 0) {
          montoConcepto = totalAmount;
        }
      }
      return {
        ...student,
        montoConcepto,
        leagueDisplay: getLeagueDisplay(student.league),
        sureDisplay: getSureDisplay(student.sure)
      };
    });
  }, [
    estudiantes,
    searchTerm,
    categoryFilter,
    leagueFilter,
    conceptFilter,
    selectedYear,
    selectedSemester,
    paymentStatusFilter,
    paymentsInRangeMap
  ]);

  const totalPages = Math.ceil(processedStudents.length / itemsPerPage);
  const paginatedStudents = processedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const canExport = processedStudents.length > 0 && !!categoryFilter;

  const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDownloadExcel = () => {
    if (!canExport) return;

    const headers = ['Nombre Completo', 'Fecha de Nacimiento', 'Categoría'];
    if (leagueFilter) {
      headers.push('Liga');
    }
    if (sureFilter) {
      headers.push('Seguro');
    }
    if (conceptFilter && selectedYear && selectedSemester) {
      headers.push(`Monto ${conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}`);
    }

    const data = processedStudents.map(student => {
      const row = [
        `${student.name} ${student.lastName}`,
        formatDate(student.birthDate),
        new Date(student.birthDate).getFullYear()
      ];

      if (leagueFilter) {
        row.push(student.leagueDisplay);
      }

      if (sureFilter) {
        row.push(student.sureDisplay);
      }

      if (conceptFilter && selectedYear && selectedSemester) {
        row.push(student.montoConcepto === 'Pendiente' ? 'Pendiente' : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`);
      }

      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    const periodLabel = conceptFilter && selectedYear && selectedSemester
      ? `S${selectedSemester}_${selectedYear}`
      : 'all';
    XLSX.writeFile(wb, `Lista_Alumnos_${periodLabel}.xlsx`);
  };

  const handleDownloadPDF = () => {
    if (!canExport) return;
    const doc = new jsPDF();
    const periodLabel = conceptFilter && selectedYear && selectedSemester
      ? `S${selectedSemester} ${selectedYear}`
      : `Categoría ${categoryFilter}`;
    doc.setFillColor(234, 38, 143);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('Lista de Alumnos', 14, 14);
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(10);
    doc.text(`Filtro aplicado: ${periodLabel}`, 14, 28);

    const headers = ['Nombre Completo', 'Fecha de Nacimiento', 'Categoría'];
    if (leagueFilter) {
      headers.push('Liga');
    }
    if (conceptFilter && selectedYear && selectedSemester) {
      headers.push(`Monto ${conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}`);
    }
    const data = processedStudents.map(student => {
      const row = [
        `${student.name} ${student.lastName}`,
        formatDate(student.birthDate),
        new Date(student.birthDate).getFullYear().toString()
      ];

      if (leagueFilter) {
        row.push(student.leagueDisplay);
      }

      if (conceptFilter && selectedYear && selectedSemester) {
        row.push(student.montoConcepto === 'Pendiente' ? 'Pendiente' : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`);
      }

      return row;
    });
    autoTable(doc, {
      startY: 34,
      head: [headers],
      body: data,
      headStyles: { fillColor: [234, 38, 143], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 251, 255] },
      styles: { fontSize: 9 },
    });
    const fileLabel = conceptFilter && selectedYear && selectedSemester
      ? `S${selectedSemester}_${selectedYear}`
      : 'all';
    doc.save(`Lista_Alumnos_${fileLabel}.pdf`);
  };

  const uniqueBirthYears = [...new Set(estudiantes.map(s => new Date(s.birthDate).getFullYear()))].sort((a, b) => b - a);

  const getEmptyMessage = () => {
    if (!categoryFilter) return 'Primero selecciona una categoría para comenzar.';
    if (conceptFilter && (!selectedYear || !selectedSemester)) return 'Por favor, selecciona año y semestre para el concepto.';
    if (conceptFilter && selectedYear && availableSemestersForSelectedYear.length === 0) {
      return 'No hay pagos de ese concepto para el año seleccionado.';
    }
    if (conceptFilter && selectedYear && selectedSemester && paymentStatusFilter === 'pendientes') {
      return 'No hay alumnos pendientes para ese concepto en el período seleccionado.';
    }
    if (conceptFilter && selectedYear && selectedSemester && paymentStatusFilter === 'pagados') {
      return 'No hay alumnos con pagos para ese concepto en el período seleccionado.';
    }
    if (leagueFilter === 'Sí') return 'No hay alumnos que jueguen liga con los filtros seleccionados.';
    if (leagueFilter === 'No') return 'No hay alumnos que no jueguen liga con los filtros seleccionados.';
    if (leagueFilter === 'No especificado') return 'No hay alumnos con liga no especificada con los filtros seleccionados.';
    if (categoryFilter && !conceptFilter && !leagueFilter) return `No hay alumnos en la categoría ${categoryFilter}.`;
    if (!categoryFilter && !leagueFilter && !conceptFilter && !searchTerm.trim()) return 'Por favor, selecciona al menos un filtro o usa la búsqueda.';
    return 'No se encontraron alumnos con los filtros seleccionados.';
  };

  if (studentsLoading || loadingPayments || !authReady) {
    return (
      <div className="list-student-loading-screen" role="status" aria-live="polite">
        <div className="list-student-loading-card">
          <div className="list-student-loading-spinner" aria-hidden="true" />
          <p>Cargando listado de alumnos...</p>
        </div>
      </div>
    );
  }

  if (auth !== 'admin') {
    return <div className="error-message">No tienes permisos para ver esta lista.</div>;
  }

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
          activeRoute="/liststudent"
        />
        <main className="main-content">
          <section className="students-filter">
            <div className="filter-actions list">
              <div className="filter-group filter-group-primary">
                <label>Categoría:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                  className="filter-select"
                >
                  <option value="">Seleccionar</option>
                  <option value="all">Todas las categorías</option>
                  {uniqueBirthYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              {!categoryFilter && (
                <p className="filter-flow-hint">Selecciona una categoría para habilitar los demás filtros.</p>
              )}
              {categoryFilter && (
                <>
                  <div className="filter-group">
                    <label>Liga:</label>
                    <select
                      value={leagueFilter}
                      onChange={(e) => { setLeagueFilter(e.target.value); setCurrentPage(1); }}
                      className="filter-select"
                    >
                      <option value="">Seleccionar</option>
                      <option value="all">Todos</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                      <option value="No especificado">No especificado</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Seguro:</label>
                    <select
                      value={sureFilter}
                      onChange={(e) => { setSureFilter(e.target.value); setCurrentPage(1); }}
                      className="filter-select"
                    >
                      <option value="">Seleccionar</option>
                      <option value="all">Todos</option>
                      <option value="Sí">Sí</option>
                      <option value="No">No</option>
                      <option value="No especificado">No especificado</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Concepto:</label>
                    <select
                      value={conceptFilter}
                      onChange={(e) => { setConceptFilter(e.target.value); setCurrentPage(1); }}
                      className="filter-select"
                      title="Selecciona un concepto para habilitar los filtros de período"
                    >
                      <option value="">Seleccionar</option>
                      {concepts.map(c => (
                        <option key={c._id} value={c.name}>
                          {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {conceptFilter && (
                    <>
                      <div className="filter-group">
                        <label>Año:</label>
                        <select
                          value={selectedYear}
                          onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                          className="filter-select"
                        >
                          <option value="">Seleccionar</option>
                          {availablePaymentYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Semestre:</label>
                        <select
                          value={selectedSemester}
                          onChange={(e) => { setSelectedSemester(e.target.value); setCurrentPage(1); }}
                          className="filter-select"
                          disabled={!selectedYear || availableSemestersForSelectedYear.length === 0}
                        >
                          <option value="">Seleccionar</option>
                          {availableSemestersForSelectedYear.includes(1) && (
                            <option value="1">1° Semestre (Ene-Jun)</option>
                          )}
                          {availableSemestersForSelectedYear.includes(2) && (
                            <option value="2">2° Semestre (Jul-Dic)</option>
                          )}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Estado de pago:</label>
                        <select
                          value={paymentStatusFilter}
                          onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }}
                          className="filter-select"
                          disabled={!selectedYear || !selectedSemester}
                        >
                          <option value="pagados">Pagados</option>
                          <option value="pendientes">Pendientes</option>
                          <option value="todos">Todos</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {categoryFilter && (
              <div className="filter-actions secondary-actions">
                <div className="filter-group search-group">
                  <label>Buscar alumno:</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="filter-input"
                    placeholder="Nombre, apellido o DNI"
                  />
                </div>
                <div className="download-actions">
                  <button className="download-btn" onClick={handleDownloadExcel} disabled={!canExport}>
                    <FaDownload /> Excel
                  </button>
                  <button className="download-btn pdf-btn" onClick={handleDownloadPDF} disabled={!canExport}>
                    <FaFilePdf /> PDF
                  </button>
                  <button className="download-btn clear-btn" onClick={handleResetFilters}>
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </section>
          {categoryFilter && (
            <section className="students-table-payment animate-fade-in">
              <div className="table-wrapper">
                <table className="students-payment">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre Completo</th>
                      <th>Fecha de Nacimiento</th>
                      <th>Categoría</th>
                      {leagueFilter && <th>Liga</th>}
                      {conceptFilter && selectedYear && selectedSemester && (
                        <th>Monto {conceptFilter.charAt(0).toUpperCase() + conceptFilter.slice(1)}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.length > 0 ? (
                      paginatedStudents.map((student, index) => (
                        <tr key={student._id}>
                          <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                          <td>{`${student.name} ${student.lastName}`}</td>
                          <td>{formatDate(student.birthDate)}</td>
                          <td>{new Date(student.birthDate).getFullYear()}</td>
                          {leagueFilter && <td>{student.leagueDisplay}</td>}
                          {conceptFilter && selectedYear && selectedSemester && (
                            <td>
                              {student.montoConcepto === 'Pendiente'
                                ? 'Pendiente'
                                : `$${Number(student.montoConcepto).toLocaleString('es-ES')}`}
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={
                          4 +
                          (leagueFilter ? 1 : 0) +
                          (conceptFilter && selectedYear && selectedSemester ? 1 : 0)
                        } className="empty-table-message">
                          {getEmptyMessage()}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                showNumbers={false}
                showSummary={true}
                prevLabel="Anterior"
                nextLabel="Siguiente"
                hideIfSinglePage={true}
                buttonClassName=""
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default ListStudent;
