import { useState, useContext, useEffect, useMemo } from 'react';
import { AttendanceContext } from '../../context/attendance/AttendanceContext';
import { StudentsContext } from '../../context/student/StudentContext';
import { LoginContext } from '../../context/login/LoginContext';
import { FaFileExport, FaSearch, FaTimes } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import { format, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { Modal, Button, Form } from 'react-bootstrap';
import 'react-datepicker/dist/react-datepicker.css';
import './attendance.css';
import AppNavbar from '../navbar/AppNavbar';
import DesktopNavbar from '../navbar/DesktopNavbar';
import logo from '../../assets/logo.png';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { es } from 'date-fns/locale';
import Sidebar from '../sidebar/Sidebar';
import Swal from 'sweetalert2';

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [isAttendanceSaved, setIsAttendanceSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(startOfMonth(new Date()));
  const [reportEndDate, setReportEndDate] = useState(endOfMonth(new Date()));
  const [reportFormat, setReportFormat] = useState('excel');
  const [reportError, setReportError] = useState(null);

  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchTerm, setSearchTerm] = useState('');

  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { auth } = useContext(LoginContext);
  const { agregarAsistencia, actualizarAsistencia, asistencias, isLoading } = useContext(AttendanceContext);

  const activeStudents = useMemo(() => {
    if (!estudiantes || !Array.isArray(estudiantes)) return [];
    return estudiantes.filter((student) => student.state === 'Activo');
  }, [estudiantes]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(activeStudents.map(s => s.category))]
      .filter(c => c)
      .sort();
    return uniqueCategories;
  }, [activeStudents]);

  const categoryCounts = useMemo(() => {
    return activeStudents.reduce((acc, student) => {
      const key = student.category;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [activeStudents]);

  const attendanceSummary = useMemo(() => {
    if (!Array.isArray(filteredStudents) || filteredStudents.length === 0) {
      return { total: 0, present: 0, absent: 0, unmarked: 0, completion: 0 };
    }

    let present = 0;
    let absent = 0;

    filteredStudents.forEach((student) => {
      const mark = attendance[student._id];
      if (mark === 'present') present += 1;
      if (mark === 'absent') absent += 1;
    });

    const total = filteredStudents.length;
    const marked = present + absent;
    const unmarked = Math.max(0, total - marked);
    const completion = total > 0 ? Math.round((marked / total) * 100) : 0;

    return { total, present, absent, unmarked, completion };
  }, [filteredStudents, attendance]);

  const isReadOnly = isAttendanceSaved && !isEditing;
  // useEffects
  useEffect(() => {
    if (auth === 'admin' || auth === 'user') {
      obtenerEstudiantes();
    }
  }, [auth, obtenerEstudiantes]);

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
    if (selectedCategory) {
      const studentsArray = Array.isArray(activeStudents) ? activeStudents : [];
      const filteredByCategory = studentsArray.filter(student => student.category === selectedCategory);
      const filteredBySearch = filteredByCategory.filter(student => {
        const searchNormalized = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nameNormalized = student.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const lastNameNormalized = student.lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const fullName = `${nameNormalized} ${lastNameNormalized}`;
        return fullName.includes(searchNormalized);
      });
      filteredBySearch.sort((a, b) => a.lastName.localeCompare(b.lastName));
      setFilteredStudents(filteredBySearch);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedCategory, activeStudents, searchTerm]);

  useEffect(() => {
    if (selectedCategory && selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd'); // Usar fecha local sin hora

      const asistenciaExistente = asistencias.find(asistencia => {
        const asistenciaDate = new Date(asistencia.date);
        const formattedAsistenciaDate = isValid(asistenciaDate) ? format(asistenciaDate, 'yyyy-MM-dd') : null;
        return formattedAsistenciaDate === formattedDate && asistencia.category === selectedCategory;
      });

      if (asistenciaExistente) {
        const newAttendance = {};
        if (Array.isArray(asistenciaExistente.attendance)) {
          asistenciaExistente.attendance.forEach(student => {
            if (student.present === true) newAttendance[student.idStudent] = 'present';
            else if (student.present === false) newAttendance[student.idStudent] = 'absent';
            else newAttendance[student.idStudent] = null;
          });
        }
        setAttendance(newAttendance);
        setIsAttendanceSaved(true);
        setIsEditing(false);
      } else {
        setAttendance({});
        setIsAttendanceSaved(false);
        setIsEditing(false);
      }
    }
  }, [selectedCategory, selectedDate, asistencias]);

  const handleAttendanceChange = (studentId, status) => {
    setAttendance(prevState => ({
      ...prevState,
      [studentId]: prevState[studentId] === status ? null : status
    }));
  };

  const handleAttendanceSubmit = async () => {
    if (!filteredStudents.length) {
      Swal.fire('Atención', 'No hay estudiantes en esta categoría.', 'warning');
      return;
    }
    if (!selectedDate || isNaN(new Date(selectedDate).getTime())) {
      Swal.fire('Atención', 'Por favor, selecciona una fecha válida.', 'warning');
      return;
    }

    const hasAtLeastOneMark = filteredStudents.some((student) => {
      const status = attendance[student._id];
      return status === 'present' || status === 'absent';
    });

    if (!hasAtLeastOneMark) {
      Swal.fire(
        'Atención',
        'Debes marcar la asistencia de al menos un alumno antes de guardar.',
        'warning'
      );
      return;
    }

    if (attendanceSummary.unmarked > 0) {
      const result = await Swal.fire({
        title: 'Hay alumnos sin marcar',
        text: `Todavía hay ${attendanceSummary.unmarked} alumno(s) sin marcar. ¿Querés guardar igual y completar después?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Guardar igual',
        cancelButtonText: 'Volver'
      });

      if (!result.isConfirmed) {
        return;
      }
    }
    // Preparar datos
const attendanceData = {
  date: new Date(selectedDate).toISOString(),
  category: selectedCategory,
  attendance: filteredStudents.map(student => {
    const status = attendance[student._id];
    const isPresent = status === 'present' ? true : (status === 'absent' ? false : null);

    return {
      idStudent: student._id,
      name: student.name,
      lastName: student.lastName,
      present: isPresent
    };
  })
};

    let success = false;
    if (isAttendanceSaved) {
      success = await actualizarAsistencia(attendanceData);
    } else {
      success = await agregarAsistencia(attendanceData);
    }

    if (success) {
      setIsAttendanceSaved(true);
      setIsEditing(false);
    }
  };

  const handleEditAttendance = () => setIsEditing(true);
  const handleCancelEdit = () => setIsEditing(false);
  const handleOpenReportModal = () => {
    if (auth !== 'admin') return;
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
        return false;
      }
      return asistencia.category === selectedCategory;
    });

    if (!filteredAsistencias.length) {
      setReportError('No hay datos de asistencia para el rango de fechas seleccionadas en esta categoría.');
      return;
    }

    const attendanceDateKeys = [...new Set(
      filteredAsistencias
        .map((asistencia) => {
          const asistenciaDate = new Date(asistencia.date);
          return isValid(asistenciaDate) ? format(asistenciaDate, 'yyyy-MM-dd') : null;
        })
        .filter(Boolean)
    )].sort();

    const attendanceDates = attendanceDateKeys.map(dateKey =>
      format(new Date(`${dateKey}T00:00:00`), 'dd/MM/yyyy')
    );

    const reportData = [];
    const studentsWithAttendance = {};
    const summary = {};

    filteredAsistencias.forEach(asistencia => {
      const asistenciaDate = new Date(asistencia.date);
      const dateKey = format(asistenciaDate, 'dd/MM/yyyy');
      if (!summary[dateKey]) {
        summary[dateKey] = { present: 0, absent: 0 };
      }

      if (Array.isArray(asistencia.attendance)) {
        asistencia.attendance.forEach(studentAttendance => {
          const studentId = studentAttendance.idStudent;
          if (!studentsWithAttendance[studentId]) {
            studentsWithAttendance[studentId] = {
              name: studentAttendance.name,
              lastName: studentAttendance.lastName,
              category: selectedCategory
            };
          }
          let statusChar = '-';
          if (studentAttendance.present === true) {
            statusChar = 'P';
            summary[dateKey].present += 1;
          } else if (studentAttendance.present === false) {
            statusChar = 'A';
            summary[dateKey].absent += 1;
          }
          // Si es null, queda como '-'

          studentsWithAttendance[studentId][dateKey] = statusChar;
        });
      }
    });

    Object.values(studentsWithAttendance).forEach(studentData => {
      const row = {
        'Nombre completo': `${studentData.name} ${studentData.lastName}`,
        Categoría: studentData.category
      };
      attendanceDates.forEach(date => {
        row[date] = studentData[date] || '-';
      });
      reportData.push(row);
    });

    if (reportFormat === 'excel') {
      const summaryRow = {
        'Nombre completo': 'Resumen (P/A)',
        Categoría: '',
        ...attendanceDates.reduce((acc, date) => {
          acc[date] = `P:${summary[date]?.present || 0} A:${summary[date]?.absent || 0}`;
          return acc;
        }, {})
      };

      const exportData = [
        ...reportData,
        summaryRow
      ];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
      XLSX.writeFile(wb, `Reporte_${selectedCategory}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } else {
      // PDF
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFillColor(234, 38, 143);
      doc.rect(0, 0, 297, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.text(`Reporte de Asistencia - ${selectedCategory}`, 14, 13);
      doc.setTextColor(33, 37, 41);
      doc.setFontSize(10);
      doc.text(`Período: ${format(reportStartDate, 'dd/MM/yyyy')} a ${format(reportEndDate, 'dd/MM/yyyy')}`, 14, 27);

      const headers = ['Nombre completo', ...attendanceDates.map(d => d.slice(0, 5))]; // Solo dd/MM
      const body = reportData.map(row => [
        row['Nombre completo'],
        ...attendanceDates.map(date => row[date] || '-')
      ]);

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 32,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 38, 143], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 251, 255] },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Reporte_${selectedCategory}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    }
    setIsReportModalOpen(false);
  };

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
          activeRoute="/attendance"
        />
        <main className="main-content">
          <section className="category-selection">
            {categories.length > 0 ? (
              <>
                {windowWidth <= 576 && (
                  <div className="category-mobile-select-wrap">
                    <label htmlFor="attendanceCategorySelect" className="category-mobile-label">Categoría</label>
                    <select
                      id="attendanceCategorySelect"
                      className="category-mobile-select"
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value || null)}
                    >
                      <option value="" disabled>Seleccionar categoría</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category} ({categoryCounts[category] || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {windowWidth > 576 && (
                  <div className="category-grid">
                    {categories.map(category => (
                      <button
                        key={category}
                        className={`category-button ${selectedCategory === category ? 'selected' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="category-name">{category}</span>
                        <span className="category-count">{categoryCounts[category] || 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="no-data-msg">No hay categorías disponibles.</p>
            )}
          </section>
          {selectedCategory && (
            <>
              <section className="attendance-overview">
                <div className="attendance-stats-grid">
                  <article className="attendance-stat-card">
                    <span>Total</span>
                    <strong>{attendanceSummary.total}</strong>
                  </article>
                  <article className="attendance-stat-card present">
                    <span>Presentes</span>
                    <strong>{attendanceSummary.present}</strong>
                  </article>
                  <article className="attendance-stat-card absent">
                    <span>Ausentes</span>
                    <strong>{attendanceSummary.absent}</strong>
                  </article>
                  <article className="attendance-stat-card unmarked">
                    <span>Sin marcar</span>
                    <strong>{attendanceSummary.unmarked}</strong>
                  </article>
                </div>

                <div className="attendance-progress-wrap">
                  <div className="attendance-progress-labels">
                    <span>Progreso de marcado</span>
                    <strong>{attendanceSummary.completion}%</strong>
                  </div>
                  <div className="attendance-progress-track">
                    <div
                      className="attendance-progress-fill"
                      style={{ width: `${attendanceSummary.completion}%` }}
                    />
                  </div>
                </div>
              </section>
              <section className="attendance-table-panel">
                <div className="attendance-header">
                  <div className="attendance-date-picker">
                    <DatePicker
                      selected={selectedDate}
                      onChange={setSelectedDate}
                      maxDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      className="attendance-date-input"
                      locale={es}
                      popperPlacement="bottom-start"
                      popperClassName="attendance-datepicker-popper"
                      calendarClassName="attendance-datepicker-calendar"
                      wrapperClassName="attendance-datepicker-wrapper"
                      showPopperArrow={false}
                      withPortal={windowWidth <= 576}
                    />
                  </div>
                  <div className="attendance-search-container">
                    <div className="attendance-search-box">
                      <FaSearch className="attendance-search-icon" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar alumno..."
                        className="attendance-search-input"
                        disabled={isLoading}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          className="attendance-search-clear"
                          onClick={() => setSearchTerm('')}
                          aria-label="Limpiar búsqueda"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    {auth === 'admin' && (
                      <button className="attendance-report-btn" onClick={handleOpenReportModal}>
                        <FaFileExport /> Reporte
                      </button>
                    )}
                  </div>
                </div>

                {filteredStudents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th className="attendance-sticky-col">Nombre y Apellido</th>
                          <th>Presente</th>
                          <th>Ausente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => (
                          <tr key={student._id} className={attendance[student._id] === 'present' ? 'row-present' : attendance[student._id] === 'absent' ? 'row-absent' : ''}>
                            <td className="attendance-sticky-col">{student.name} {student.lastName}</td>
                            <td>
                              <input
                                type="checkbox"
                                checked={attendance[student._id] === 'present'}
                                onChange={() => handleAttendanceChange(student._id, 'present')}
                                disabled={isReadOnly}
                                className="attendance-checkbox present"
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={attendance[student._id] === 'absent'}
                                onChange={() => handleAttendanceChange(student._id, 'absent')}
                                disabled={isReadOnly}
                                className="attendance-checkbox absent"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="no-students-message">
                    <p>No hay alumnos en la categoría {selectedCategory}</p>
                  </div>
                )}
              </section>

              {filteredStudents.length > 0 && (
                <div className="attendance-buttons">
                  {!isAttendanceSaved && (
                    <button className="attendance-save-btn" onClick={handleAttendanceSubmit} disabled={isLoading}>
                      {isLoading ? 'Guardando...' : 'Guardar Asistencia'}
                    </button>
                  )}
                  {isAttendanceSaved && !isEditing && (
                    <button className="attendance-edit-btn" onClick={handleEditAttendance}>
                      Editar Asistencia
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button className="attendance-update-btn" onClick={handleAttendanceSubmit} disabled={isLoading}>
                        {isLoading ? 'Actualizando...' : 'Actualizar Asistencia'}
                      </button>
                      <button className="attendance-cancel-btn" onClick={handleCancelEdit} disabled={isLoading}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          {auth === 'admin' && (
            <Modal show={isReportModalOpen} onHide={() => { setIsReportModalOpen(false); setReportError(null); }} centered>
              <Modal.Header closeButton className="modal-header-attendance">
                <Modal.Title>Generar Reporte de Asistencia</Modal.Title>
              </Modal.Header>
              <Modal.Body className="modal-body-attendance">
                {reportError && <div className="alert alert-danger">{reportError}</div>}
                <Form>
                  <Form.Group controlId="reportStartDate" className="mb-3">
                    <Form.Label>Fecha Inicial:</Form.Label>
                    <DatePicker
                      selected={reportStartDate}
                      onChange={setReportStartDate}
                      maxDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                      locale={es}
                      dropdownMode="select"
                    />
                  </Form.Group>
                  <Form.Group controlId="reportEndDate" className="mb-3">
                    <Form.Label>Fecha Final:</Form.Label>
                    <DatePicker
                      selected={reportEndDate}
                      onChange={setReportEndDate}
                      maxDate={new Date()}
                      minDate={reportStartDate}
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                      locale={es}
                      dropdownMode="select"
                    />
                  </Form.Group>
                  <Form.Group controlId="reportFormat" className="mb-3">
                    <Form.Label>Formato:</Form.Label>
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
          )}
        </main>
      </div>
    </div>
  );
};

export default Attendance;
