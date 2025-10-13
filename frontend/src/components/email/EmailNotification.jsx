import { useState, useEffect, useContext } from "react";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import { EmailContext } from "../../context/email/EmailContext";
import { LoginContext } from "../../context/login/LoginContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaBars, FaUsers, FaMoneyBill, FaList, FaExchangeAlt, FaCalendarCheck, FaUserCog,
  FaCog, FaEnvelope, FaHome, FaClipboardList, FaSearch, FaArrowLeft, FaTimes, FaCheck,
  FaTrash, FaUserCircle, FaChevronDown, FaTimes as FaTimesClear,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "./emailNotification.css";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';

const EmailNotification = () => {
  const { estudiantes, obtenerEstudiantes } = useContext(StudentsContext);
  const { cuotas, obtenerCuotas } = useContext(SharesContext);
  const { sendMultipleEmails } = useContext(EmailContext);
  const { waitForAuth, userData, auth } = useContext(LoginContext);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [subject, setSubject] = useState("");
  const [displayMessage, setDisplayMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isOverdueMode, setIsOverdueMode] = useState(false);
  const [cuotaBase, setCuotaBase] = useState(30000);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [activeButton, setActiveButton] = useState(null);

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal' },
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
    { name: 'Reporte', route: '/listeconomic', icon: <FaList />, category: 'finanzas' },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas' },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion' },
    { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion' },
    { name: 'Envíos de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion' },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
  ];

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth < 576) {
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
    const loadData = async () => {
      setDataLoading(true);
      try {
        if (!auth) {
          await waitForAuth();
        }
        if (!userData || !auth) {
          console.warn("Autenticación no disponible, redirigiendo a login...");
          navigate("/login");
          return;
        }

        const studentPromise = obtenerEstudiantes().catch((error) => {
          console.error("Error cargando estudiantes:", error);
          return [];
        });
        const cuotasPromise = obtenerCuotas().catch((error) => {
          console.error("Error cargando cuotas:", error);
          return [];
        });
        const cuotaBasePromise = fetchCuotaBase().catch((error) => {
          console.error("Error cargando cuota base:", error);
          return 30000;
        });

        await Promise.all([studentPromise, cuotasPromise, cuotaBasePromise]);
      } catch (error) {
        console.error("Error general al cargar datos:", error);
        Swal.fire("Error", "No se pudieron cargar los datos iniciales.", "error");
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [obtenerEstudiantes, obtenerCuotas, waitForAuth, auth, userData, navigate]);

  const fetchCuotaBase = async () => {
    try {
      const response = await axios.get("/api/config/cuotaBase", { withCredentials: true });
      setCuotaBase(response.data.value || 30000);
      return response.data.value || 30000;
    } catch (error) {
      console.error("Error al obtener cuota base:", error);
      setCuotaBase(30000);
      return 30000;
    }
  };

  useEffect(() => {
    const searchNormalized = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const filtered = estudiantes.filter((student) => {
      const nameNormalized = student.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const lastNameNormalized = student.lastName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const fullName = `${nameNormalized} ${lastNameNormalized}`;
      const dniNormalized = student.dni
        ? student.dni.toString().toLowerCase()
        : "";

      return (
        fullName.startsWith(searchNormalized) ||
        nameNormalized.startsWith(searchNormalized) ||
        lastNameNormalized.startsWith(searchNormalized) ||
        dniNormalized.startsWith(searchNormalized)
      ) && !selectedStudents.some((s) => s._id === student._id);
    });
    setFilteredStudents(filtered);
  }, [searchTerm, estudiantes, selectedStudents]);

  const handleSelectStudent = (student) => {
    if (student.state === "Inactivo") {
      Swal.fire("Error", "No se puede seleccionar un estudiante inactivo.", "error");
      return;
    }
    if (!student.mail) {
      Swal.fire("Error", "El estudiante no tiene un correo registrado.", "error");
      return;
    }
    setSelectedStudents([...selectedStudents, student]);
    setSearchTerm("");
    setIsOverdueMode(false);
    setActiveButton(null);
  };

  const handleRemoveStudent = (studentId) => {
    setSelectedStudents(selectedStudents.filter((s) => s._id !== studentId));
    if (isOverdueMode) {
      generateOverdueMessages(selectedStudents.filter((s) => s._id !== studentId));
    }
  };

  const handleSelectAll = () => {
    const activeStudents = estudiantes.filter((s) => s.state === "Activo" && s.mail);
    if (activeStudents.length === 0) {
      Swal.fire("Advertencia", "No hay estudiantes activos con correo registrado.", "warning");
      return;
    }
    setSelectedStudents(activeStudents);
    setSearchTerm("");
    setIsOverdueMode(false);
    setSubject("");
    setDisplayMessage("");
    setActiveButton("selectAll");
  };

  const generateOverdueMessages = (students) => {
    if (students.length === 0) {
      setSubject("");
      setDisplayMessage("");
      return [];
    }
    const emails = [];
    let summary = "";

    students.forEach((student) => {
      const studentCuotas = cuotas.filter(
        (c) =>
          c.student &&
          c.student._id &&
          c.student._id.toString() === student._id.toString() &&
          c.state === "Vencido"
      );
      if (studentCuotas.length > 0) {
        const cuotaDetails = studentCuotas
          .map((cuota) => {
            const cuotaDate = new Date(cuota.date);
            return `- ${monthNames[cuotaDate.getMonth()]} ${cuotaDate.getFullYear()}: $${cuota.amount.toLocaleString("es-ES")}`;
          })
          .join("<br>");

        const totalAmount = studentCuotas.reduce((sum, c) => sum + c.amount, 0);

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
            return `- ${monthNames[cuotaDate.getMonth()]} ${cuotaDate.getFullYear()}: $${cuota.amount.toLocaleString(
              "es-ES"
            )}`;
          })
          .join("\n")}\nTotal adeudado: $${totalAmount.toLocaleString("es-ES")}\n\n`;
      }
    });

    setSubject("Recordatorio de cuotas vencidas");
    setDisplayMessage(summary.trim());
    return emails;
  };

  const handleSelectOverdue = async () => {
    if (!Array.isArray(cuotas) || cuotas.length === 0) {
      Swal.fire("Advertencia", "No hay cuotas cargadas en el sistema.", "warning");
      return;
    }
    if (!Array.isArray(estudiantes) || estudiantes.length === 0) {
      Swal.fire("Advertencia", "No hay estudiantes cargados en el sistema.", "warning");
      return;
    }

    const studentsWithOverdue = [];
    const processedStudents = new Set();

    cuotas.forEach((cuota) => {
      if (cuota.state === "Vencido" && cuota.student && cuota.student._id) {
        const studentId = cuota.student._id.toString();
        if (!processedStudents.has(studentId)) {
          const student = estudiantes.find(
            (s) => s._id.toString() === studentId && s.mail && s.state === "Activo"
          );
          if (student) {
            studentsWithOverdue.push(student);
            processedStudents.add(studentId);
          }
        }
      }
    });

    if (studentsWithOverdue.length === 0) {
      Swal.fire("Información", "No hay estudiantes con cuotas vencidas y correo registrado.", "info");
      return;
    }

    setSelectedStudents(studentsWithOverdue);
    setSearchTerm("");
    setIsOverdueMode(true);
    generateOverdueMessages(studentsWithOverdue);
    setActiveButton("selectOverdue");
  };

  const handleCancel = () => {
    setSelectedStudents([]);
    setSubject("");
    setDisplayMessage("");
    setSearchTerm("");
    setGlobalSearchTerm("");
    setIsOverdueMode(false);
    setActiveButton(null);
  };

  const handleClearEmail = () => {
    setSubject("");
    setDisplayMessage("");
  };

    const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSendToAll = async () => {
    if (selectedStudents.length === 0) {
      Swal.fire("Error", "Selecciona al menos un estudiante.", "error");
      return;
    }
        // Convertir saltos de línea a HTML br tags para emails personalizados
    const formatMessageForEmail = (message) => {
      if (!message) return "Mensaje no especificado";
      return message.replace(/\n/g, '<br>');
    };

    const emails = isOverdueMode
      ? generateOverdueMessages(selectedStudents)
      : [
          {
            recipient: selectedStudents.map((s) => s.mail).join(","),
            subject,
            message: formatMessageForEmail(displayMessage),
          },
        ];    if (emails.length === 0) {
      Swal.fire(
        "Error",
        "No hay mensajes válidos para enviar. Verifica que los estudiantes seleccionados tengan cuotas vencidas.",
        "error"
      );
      return;
    }

    const confirm = await Swal.fire({
      title: "¿Confirmar envío?",
      text: `Se enviarán ${emails.length} correos personalizados a los estudiantes seleccionados.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Enviar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      await sendMultipleEmails(emails);
      Swal.fire("¡Éxito!", `Se enviaron ${emails.length} correos correctamente.`, "success");
      handleCancel();
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    navigate("/login");
    setIsMenuOpen(false);
  };

  return (
    <div className={`app-container ${windowWidth <= 576 ? "mobile-view" : ""}`}>
      {windowWidth <= 576 && (
        <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
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
            {searchTerm && (
              <div className="student-dropdown">
                {dataLoading ? (
                  <div className="student-option">Cargando estudiantes...</div>
                ) : filteredStudents.length ? (
                  filteredStudents.map((student) => (
                    <div
                      key={student._id}
                      className="student-option"
                      onClick={() => handleSelectStudent(student)}
                    >
                      {student.name} {student.lastName} (DNI: {student.dni})
                    </div>
                  ))
                ) : (
                  <div className="student-option">No hay coincidencias</div>
                )}
              </div>
            )}
          </div>
          <div className="nav-right-section">
            <div
              className="profile-container"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">Hola, {userData?.name || "Usuario"}</span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? "rotated" : ""}`} />
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
        <aside className={`sidebar ${isMenuOpen ? "open" : "closed"}`}>
          <nav className="sidebar-nav">
            <div className="sidebar-section">
              <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
              <ul className="sidebar-menu">
                {menuItems.map((item, index) => (
                  <li
                    key={index}
                    className={`sidebar-menu-item ${item.route === "/email-notifications" ? "active" : ""}`}
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
        <main className={`main-content ${!isMenuOpen ? "expanded" : ""}`}>
          <section className="dashboard-header">
          </section>
          <section className="student-selection">
            <div className="selected-students">
              {selectedStudents.slice(0, 10).map((student) => (
                <div key={student._id} className="selected-student">
                  {student.name} {student.lastName}
                  <FaTimes
                    onClick={() => handleRemoveStudent(student._id)}
                    className="remove-icon"
                  />
                </div>
              ))}
              {selectedStudents.length > 10 && (
                <div className="selected-student">
                  +{selectedStudents.length - 10} más
                </div>
              )}
            </div>
            <div className="selection-actions">
              <button
                className={`quick-action-btn email select-all-btn ${activeButton === "selectAll" ? "active" : ""}`}
                onClick={handleSelectAll}
                disabled={loading || dataLoading}
              >
                Todos Activos
              </button>
              <button
                className={`quick-action-btn email select-overdue-btn ${activeButton === "selectOverdue" ? "active" : ""}`}
                onClick={handleSelectOverdue}
                disabled={loading || dataLoading}
              >
                Cuotas Vencidas
              </button>
              <button
                className="quick-action-btn email"
                onClick={handleCancel}
                disabled={loading || dataLoading}
              >
                Cancelar
              </button>
            </div>
          </section>
          <section className="email-composition">
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
              placeholder="Escribe tu mensaje aquí...&#10;&#10;Presiona Enter para crear saltos de línea."
              rows={8}
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5'
              }}
            />
               {displayMessage && !isOverdueMode && (
              <div className="email-preview">
                <h4 style={{marginBottom: '10px', color: 'var(--text-light)'}}>Vista previa del email:</h4>
                <div className="preview-content" dangerouslySetInnerHTML={{ __html: displayMessage.replace(/\n/g, '<br>') }} />
              </div>
            )}
            <div className="email-actions">
              <button
                className="quick-action-btn cancel-btn"
                onClick={handleClearEmail}
                disabled={loading || isOverdueMode || dataLoading}
              >
                Borrar
              </button>
              <button
                className="quick-action-btn"
                onClick={handleSendToAll}
                disabled={loading || dataLoading}
              >
                {loading ? "Enviando..." : `Enviar a ${selectedStudents.length} Seleccionado(s)`}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default EmailNotification;