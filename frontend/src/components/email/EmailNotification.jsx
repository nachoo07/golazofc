import { useState, useEffect, useContext, useMemo, useRef } from "react";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import { EmailContext } from "../../context/email/EmailContext";
import { LoginContext } from "../../context/login/LoginContext";
import { useNavigate } from "react-router-dom";
import { FaTimes, FaTimes as FaTimesClear, FaSearch, FaSpinner } from "react-icons/fa";
import Swal from "sweetalert2";
import "./emailNotification.css";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';
import DesktopNavbar from "../navbar/DesktopNavbar";
import Sidebar from "../sidebar/Sidebar";
import Pagination from "../pagination/Pagination";

const ITEMS_PER_PAGE = 8;
const MOBILE_SELECTED_LIMIT = 10;
const DEFAULT_SELECTED_LIMIT = 30;

const EmailNotification = () => {
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { cuotas, obtenerCuotas } = useContext(SharesContext);
  const { sendMultipleEmails, createEmailProgressStream } = useContext(EmailContext);
  const { userData, auth, authReady } = useContext(LoginContext);
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [displayMessage, setDisplayMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOverdueMode, setIsOverdueMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeButton, setActiveButton] = useState(null);
  const [filterState, setFilterState] = useState("todos");
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllSelectedMobile, setShowAllSelectedMobile] = useState(false);
  const [progress, setProgress] = useState({
    status: "idle",
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });

  const progressStreamRef = useRef(null);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const closeProgressStream = () => {
    if (progressStreamRef.current) {
      progressStreamRef.current.close();
      progressStreamRef.current = null;
    }
  };

  useEffect(() => () => closeProgressStream(), []);

  useEffect(() => {
    if (!loading) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading]);

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
    const loadData = async () => {
      if (!authReady) return;
      setDataLoading(true);
      try {
        if (!userData || !auth) {
          navigate("/login");
          return;
        }

        await Promise.all([
          obtenerEstudiantes().catch(() => []),
          obtenerCuotas().catch(() => []),
        ]);
      } catch {
        Swal.fire("Error", "No se pudieron cargar los datos iniciales.", "error");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [auth, authReady, userData, obtenerEstudiantes, obtenerCuotas, navigate]);

  const normalize = (value = "") => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const selectedStudents = useMemo(() => {
    const selectedSet = new Set(selectedStudentIds);
    return (estudiantes || []).filter((student) => selectedSet.has(student._id));
  }, [selectedStudentIds, estudiantes]);

  const isMobileView = windowWidth <= 576;

  const visibleSelectedStudents = useMemo(() => {
    if (isMobileView && !showAllSelectedMobile) {
      return selectedStudents.slice(0, MOBILE_SELECTED_LIMIT);
    }

    if (isMobileView && showAllSelectedMobile) {
      return selectedStudents;
    }

    return selectedStudents.slice(0, DEFAULT_SELECTED_LIMIT);
  }, [isMobileView, showAllSelectedMobile, selectedStudents]);

  const hiddenSelectedCount = Math.max(0, selectedStudents.length - visibleSelectedStudents.length);

  const selectedStudentStates = useMemo(
    () => Array.from(new Set(selectedStudents.map((student) => student.state).filter(Boolean))),
    [selectedStudents]
  );

  const hasMixedSelectedStates = selectedStudentStates.length > 1;

  const filteredStudents = useMemo(() => {
    const searchNormalized = normalize(searchTerm);

    return (estudiantes || []).filter((student) => {
      const byState =
        filterState === "todos" ||
        (filterState === "activos" && student.state === "Activo") ||
        (filterState === "inactivos" && student.state === "Inactivo");

      if (!byState) return false;
      if (!searchNormalized) return true;

      const fullName = normalize(`${student.name || ""} ${student.lastName || ""}`);
      const dni = normalize(String(student.dni || ""));
      const mail = normalize(student.mail || "");

      return fullName.includes(searchNormalized) || dni.includes(searchNormalized) || mail.includes(searchNormalized);
    });
  }, [estudiantes, filterState, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const overdueEligibleIds = useMemo(() => {
    const set = new Set();
    (cuotas || []).forEach((cuota) => {
      if (cuota?.state !== "Vencido" || !cuota?.student?._id) return;
      const student = (estudiantes || []).find((s) => s._id?.toString() === cuota.student._id?.toString());
      if (student && student.state === "Activo" && student.mail) {
        set.add(student._id);
      }
    });
    return set;
  }, [cuotas, estudiantes]);

  const selectableFilteredIds = useMemo(
    () => filteredStudents.filter((s) => s.mail).map((s) => s._id),
    [filteredStudents]
  );

  const areAllFilteredSelected =
    selectableFilteredIds.length > 0 && selectableFilteredIds.every((id) => selectedStudentIds.includes(id));

  const toggleStudent = (student) => {
    const isSelected = selectedStudentIds.includes(student._id);

    if (!isSelected) {
      if (!student.mail) {
        Swal.fire("Error", "El estudiante no tiene un correo registrado.", "error");
        return;
      }
    }
    setSelectedStudentIds((prev) =>
      isSelected ? prev.filter((id) => id !== student._id) : [...prev, student._id]
    );

    if (isOverdueMode) {
      setIsOverdueMode(false);
      setActiveButton(null);
    }
  };

  const handleSelectAllActive = () => {
    const activeWithMail = (estudiantes || []).filter((s) => s.state === "Activo" && s.mail).map((s) => s._id);
    if (activeWithMail.length === 0) {
      Swal.fire("Advertencia", "No hay estudiantes activos con correo registrado.", "warning");
      return;
    }

    setSelectedStudentIds(activeWithMail);
    setIsOverdueMode(false);
    setActiveButton("selectAll");
  };

  const handleSelectFiltered = () => {
    if (selectableFilteredIds.length === 0) {
      Swal.fire("Advertencia", "No hay estudiantes con correo en el filtro actual.", "warning");
      return;
    }

    if (areAllFilteredSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !selectableFilteredIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...selectableFilteredIds])));
    }

    setIsOverdueMode(false);
    setActiveButton("selectFiltered");
  };

  const buildOverdueEmails = (students) => {
    if (!students.length) {
      return { emails: [], summary: "", computedSubject: "" };
    }

    const emails = [];
    let summary = "";

    students.forEach((student) => {
      const studentCuotas = (cuotas || []).filter(
        (c) => c?.student?._id?.toString() === student._id?.toString() && c.state === "Vencido"
      );

      if (studentCuotas.length === 0) return;

      const cuotaDetails = studentCuotas
        .map((cuota) => {
          const cuotaDate = new Date(cuota.date);
          return `- ${monthNames[cuotaDate.getMonth()]} ${cuotaDate.getFullYear()}: $${Number(cuota.amount || 0).toLocaleString("es-ES")}`;
        })
        .join("<br>");

      const totalAmount = studentCuotas.reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const emailContent = `
        <h2>Recordatorio de cuotas vencidas - ${student.name} ${student.lastName}</h2>
        <p>Estimado/a Padre/Madre</p>
        <p>Le informamos que las siguientes cuotas se encuentran vencidas:</p>
        <p>${cuotaDetails}</p>
        <p>Total adeudado: $${totalAmount.toLocaleString("es-ES")}</p>
        <p>Por favor, regularice la situación a la brevedad. Contáctenos si necesita más información.</p>
        <p>Saludos cordiales,<br>Equipo Golazo</p>
      `;

      emails.push({
        recipient: student.mail,
        subject: `Recordatorio de cuotas vencidas - ${student.name} ${student.lastName}`,
        message: emailContent,
      });

      summary += `Cuotas vencidas para ${student.name} ${student.lastName}:\n${studentCuotas
        .map((cuota) => {
          const cuotaDate = new Date(cuota.date);
          return `- ${monthNames[cuotaDate.getMonth()]} ${cuotaDate.getFullYear()}: $${Number(cuota.amount || 0).toLocaleString("es-ES")}`;
        })
        .join("\n")}\nTotal adeudado: $${totalAmount.toLocaleString("es-ES")}\n\n`;
    });

    return {
      emails,
      summary: summary.trim(),
      computedSubject: "Recordatorio de cuotas vencidas",
    };
  };

  const handleSelectOverdue = () => {
    const overdueIds = Array.from(overdueEligibleIds);
    if (overdueIds.length === 0) {
      Swal.fire("Información", "No hay estudiantes con cuotas vencidas y correo registrado.", "info");
      return;
    }

    setSelectedStudentIds(overdueIds);
    setIsOverdueMode(true);
    setActiveButton("selectOverdue");

    const students = (estudiantes || []).filter((s) => overdueIds.includes(s._id));
    const { summary, computedSubject } = buildOverdueEmails(students);
    setSubject(computedSubject);
    setDisplayMessage(summary);
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId));
  };

  const handleCancel = () => {
    setSelectedStudentIds([]);
    setSubject("");
    setDisplayMessage("");
    setSearchTerm("");
    setShowAllSelectedMobile(false);
    setIsOverdueMode(false);
    setActiveButton(null);
    setProgress({ status: "idle", total: 0, sent: 0, failed: 0, pending: 0 });
    closeProgressStream();
  };

  const formatMessageForEmail = (message) => {
    if (!message) return "Mensaje no especificado";
    return message.replace(/\n/g, "<br>");
  };

  const buildProgressId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `mail-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  };

  const handleSendToAll = async () => {
    if (selectedStudents.length === 0) {
      Swal.fire("Error", "Selecciona al menos un estudiante.", "error");
      return;
    }

    if (!isOverdueMode && (!subject.trim() || !displayMessage.trim())) {
      Swal.fire("Error", "Completá asunto y mensaje para enviar.", "error");
      return;
    }

    if (hasMixedSelectedStates) {
      Swal.fire(
        "Validación",
        "No se puede enviar en el mismo lote a alumnos Activos e Inactivos. Separá la selección en dos envíos.",
        "warning"
      );
      return;
    }

    const emails = isOverdueMode
      ? buildOverdueEmails(selectedStudents).emails
      : [
        {
          recipient: selectedStudents.map((s) => s.mail).join(","),
          subject: subject.trim(),
          message: formatMessageForEmail(displayMessage),
        },
      ];

    if (emails.length === 0) {
      Swal.fire("Error", "No hay mensajes válidos para enviar.", "error");
      return;
    }

    const plannedTotal = isOverdueMode ? emails.length : selectedStudents.length;

    const confirm = await Swal.fire({
      title: "¿Confirmar envío?",
      text: `Se enviarán ${plannedTotal} correos a los estudiantes seleccionados.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Enviar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);

    const progressId = buildProgressId();
    setProgress({ status: "started", total: plannedTotal, sent: 0, failed: 0, pending: plannedTotal });

    closeProgressStream();
    progressStreamRef.current = createEmailProgressStream(progressId, {
      onProgress: (snapshot) => setProgress(snapshot),
      onDone: (snapshot) => setProgress(snapshot),
      onError: (snapshot) => setProgress((prev) => ({ ...prev, ...snapshot, status: "failed" })),
    });

    try {
      const result = await sendMultipleEmails(emails, {
        progressId,
        enforceSingleState: true,
        selectedStudentIds,
        forcePerRecipient: true,
      });
      const total = Number(result?.total ?? plannedTotal);
      const sent = Number(result?.sent ?? 0);
      const failedCount = Number(result?.failedCount ?? 0);
      const failedRecipients = Array.isArray(result?.failed) ? result.failed : [];

      setProgress({
        status: failedCount > 0 ? "completed_with_errors" : "completed",
        total,
        sent,
        failed: failedCount,
        pending: Math.max(0, total - sent - failedCount),
      });

      if (failedCount > 0) {
        const failedPreview = failedRecipients
          .slice(0, 5)
          .map((entry) => `- ${entry.recipient}`)
          .join("<br>");

        await Swal.fire({
          title: "Envío parcial",
          html: `Se enviaron <b>${sent}</b> de <b>${total}</b> correos.<br><br>${failedPreview}${failedRecipients.length > 5 ? "<br>..." : ""}`,
          icon: "warning",
        });
      } else {
        await Swal.fire("¡Éxito!", `Se enviaron ${sent} de ${total} correos.`, "success");
      }

      handleCancel();
    } catch (error) {
      setProgress((prev) => ({ ...prev, status: "failed" }));
      Swal.fire("Error", error.message, "error");
    } finally {
      setLoading(false);
      setTimeout(() => closeProgressStream(), 2000);
    }
  };

  const progressPercent = progress.total > 0
    ? Math.min(100, Math.round(((progress.sent + progress.failed) / progress.total) * 100))
    : 0;

  return (
    <div className={`app-container ${windowWidth <= 576 ? "mobile-view" : ""} email-page`}>
      {windowWidth <= 576 && (
        <AppNavbar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          searchQuery={searchTerm}
          setSearchQuery={setSearchTerm}
        />
      )}
      {windowWidth > 576 && <DesktopNavbar logoSrc={logo} />}
      <div className="dashboard-layout">
        <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} activeRoute="/email-notifications" />
        <main className={`email-main-content ${!isMenuOpen ? "expanded" : ""}`}>
          <section className="email-top-bar">

            <div className="email-top-metrics">
              <span>Seleccionados: <b>{selectedStudents.length}</b></span>
              <span>Filtrados: <b>{filteredStudents.length}</b></span>
              {selectedStudentStates.length === 1 && (
                <span>Estado lote: <b>{selectedStudentStates[0]}</b></span>
              )}
            </div>
          </section>
          <section className="email-card email-filters-card">
            <div className="email-search-row">
              <div className="email-search-box">
                <FaSearch className="email-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="email-search-input"
                  disabled={loading || dataLoading}
                  placeholder="Buscar por nombre, apellido, DNI o mail"
                />
                {searchTerm && (
                  <button className="email-clear-btn" onClick={() => setSearchTerm("")} type="button">
                    <FaTimesClear />
                  </button>
                )}
              </div>
              <div className="email-state-filters" role="tablist" aria-label="Filtro de estado de estudiantes">
                {[
                  { key: "todos", label: "Todos" },
                  { key: "activos", label: "Activos" },
                  { key: "inactivos", label: "Inactivos" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`email-filter-pill ${filterState === option.key ? "active" : ""}`}
                    onClick={() => {
                      setFilterState(option.key);
                      setCurrentPage(1);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="email-bulk-actions">
              <button
                type="button"
                className={`quick-action-btn email select-all-btn ${activeButton === "selectAll" ? "active" : ""}`}
                onClick={handleSelectAllActive}
                disabled={loading || dataLoading}
              >
                Todos Activos
              </button>
              <button
                type="button"
                className={`quick-action-btn email select-all-btn ${activeButton === "selectFiltered" ? "active" : ""}`}
                onClick={handleSelectFiltered}
                disabled={loading || dataLoading}
              >
                {areAllFilteredSelected ? "Quitar filtrados" : "Seleccionar filtrados"}
              </button>
              <button
                type="button"
                className={`quick-action-btn email select-overdue-btn ${activeButton === "selectOverdue" ? "active" : ""}`}
                onClick={handleSelectOverdue}
                disabled={loading || dataLoading}
              >
                Cuotas Vencidas
              </button>
              <button
                type="button"
                className="quick-action-btn cancel-btn"
                onClick={handleCancel}
                disabled={loading || dataLoading}
              >
                Limpiar
              </button>
            </div>
          </section>
          <section className="email-card email-table-card">
            <div className="email-table-wrapper">
              <table className="email-students-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Alumno</th>
                    <th>DNI</th>
                    <th>Mail</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr><td colSpan={5} className="email-empty-row">Cargando estudiantes...</td></tr>
                  ) : paginatedStudents.length === 0 ? (
                    <tr><td colSpan={5} className="email-empty-row">No hay resultados para el filtro actual.</td></tr>
                  ) : (
                    paginatedStudents.map((student) => {
                      const selected = selectedStudentIds.includes(student._id);
                      const disabled = !student.mail;
                      return (
                        <tr key={student._id} className={selected ? "is-selected" : ""}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={disabled || loading}
                              onChange={() => toggleStudent(student)}
                            />
                          </td>
                          <td>{student.name} {student.lastName}</td>
                          <td>{student.dni || "-"}</td>
                          <td>{student.mail || "Sin correo"}</td>
                          <td>
                            <span className={`email-state-chip ${student.state === "Activo" ? "active" : "inactive"}`}>
                              {student.state}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              hideIfSinglePage
            />
          </section>
          <section className="email-card email-selected-card">
            <h3 className="email-subtitle">Destinatarios seleccionados</h3>
            {hasMixedSelectedStates && (
              <div className="email-mixed-warning">
                Mezcla detectada: hay alumnos Activos e Inactivos seleccionados. Separá el envío por estado.
              </div>
            )}
            <div className="selected-students">
              {selectedStudents.length === 0 && <span className="email-muted">No hay estudiantes seleccionados.</span>}
              {visibleSelectedStudents.map((student) => (
                <div key={student._id} className="selected-student">
                  {student.name} {student.lastName}
                  <FaTimes onClick={() => handleRemoveStudent(student._id)} className="remove-icon" />
                </div>
              ))}
              {hiddenSelectedCount > 0 && <span className="email-muted">+{hiddenSelectedCount} más...</span>}
            </div>
            {isMobileView && selectedStudents.length > MOBILE_SELECTED_LIMIT && (
              <button
                type="button"
                className="email-show-more-btn"
                onClick={() => setShowAllSelectedMobile((prev) => !prev)}
              >
                {showAllSelectedMobile ? "Ver menos" : `Ver más (${selectedStudents.length - MOBILE_SELECTED_LIMIT})`}
              </button>
            )}
          </section>
          <section className="email-card email-composition-card">
            <h2 className="section-title">Componer Correo</h2>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="email-subject"
              disabled={loading || isOverdueMode || dataLoading}
              placeholder="Asunto..."
            />
            <textarea
              value={displayMessage}
              onChange={(e) => setDisplayMessage(e.target.value)}
              className="email-message"
              disabled={loading || isOverdueMode || dataLoading}
              placeholder="Escribe tu mensaje aquí..."
              rows={8}
            />
            {displayMessage && !isOverdueMode && (
              <div className="email-preview">
                <h4>Vista previa del email</h4>
                <div className="preview-content" style={{ whiteSpace: "pre-wrap" }}>{displayMessage}</div>
              </div>
            )}
            {(loading || progress.status !== "idle") && (
              <div className="email-progress-card" aria-live="polite">
                <div className="email-progress-header">
                  <span>
                    {loading ? <FaSpinner className="spin" /> : null} Enviados {progress.sent} de {progress.total}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="email-progress-track">
                  <div className="email-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="email-progress-stats">
                  <span>Exitosos: {progress.sent}</span>
                  <span>Fallidos: {progress.failed}</span>
                  <span>Pendientes: {progress.pending}</span>
                </div>
              </div>
            )}
            <div className="email-actions">
              <button
                type="button"
                className="quick-action-btn cancel-btn"
                onClick={() => {
                  setSubject("");
                  setDisplayMessage("");
                }}
                disabled={loading || isOverdueMode || dataLoading}
              >
                Borrar texto
              </button>
              <button
                type="button"
                className="quick-action-btn email"
                onClick={handleSendToAll}
                disabled={loading || dataLoading || hasMixedSelectedStates}
              >
                {loading ? "Enviando..." : `Enviar a ${selectedStudents.length} seleccionado(s)`}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default EmailNotification;
