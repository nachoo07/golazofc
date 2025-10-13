import React, { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaUsers, FaList, FaTimes, FaHome, FaMoneyBill, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaClipboardList, FaArrowLeft, FaUserCircle, FaChevronDown, FaFileExport, FaSearch } from "react-icons/fa";
import { PaymentContext } from "../../context/payment/PaymentContext";
import { MotionContext } from "../../context/motion/MotionContext";
import { SharesContext } from "../../context/share/ShareContext";
import { LoginContext } from "../../context/login/LoginContext";
import { StudentsContext } from "../../context/student/StudentContext";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';
import * as XLSX from "xlsx-js-style";
import "./economicMovements.css";

// Hook para debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const EconomicMovements = () => {
  const { payments, fetchPaymentsByDateRange, loading: loadingPayments } = useContext(PaymentContext);
  const { motions, getMotionsByDateRange, loading: loadingMotions } = useContext(MotionContext);
  const { cuotas, obtenerCuotasPorFechaRange, setCuotas, loading: loadingCuotas, cuotasStatusCount } = useContext(SharesContext);
  const { auth, userData } = useContext(LoginContext);
  const { estudiantes, countStudentsByState, obtenerEstudiantes, loading: studentsLoading } = useContext(StudentsContext);
  const navigate = useNavigate();

  // Estados
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("economicFilters");
    return saved
      ? JSON.parse(saved)
      : {
          includeCuotas: true,
          includePagos: true,
          paymentConcepts: [], // "Todos" es array vacío
          includeIngresos: true,
          includeEgresos: true,
          paymentMethod: "Ambos",
        };
  });
  const [searchName, setSearchName] = useState("");
  const [paymentConceptsList, setPaymentConceptsList] = useState([]); // Lista dinámica de conceptos
  const debouncedSearchName = useDebounce(searchName, 300);
  const [data, setData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const menuItems = [
    { name: "Inicio", route: "/", icon: <FaHome />, category: "principal" },
    { name: "Alumnos", route: "/student", icon: <FaUsers />, category: "principal" },
    { name: "Cuotas", route: "/share", icon: <FaMoneyBill />, category: "finanzas" },
    { name: "Movimientos", route: "/motion", icon: <FaExchangeAlt />, category: "finanzas" },
    { name: "Asistencia", route: "/attendance", icon: <FaCalendarCheck />, category: "principal" },
    { name: "Usuarios", route: "/user", icon: <FaUserCog />, category: "configuracion" },
    { name: "Ajustes", route: "/settings", icon: <FaCog />, category: "configuracion" },
    { name: "Envios de Mail", route: "/email-notifications", icon: <FaEnvelope />, category: "comunicacion" },
    { name: "Listado de Alumnos", route: "/liststudent", icon: <FaClipboardList />, category: "informes" },
    { name: "Lista de Movimientos", route: "/listeconomic", icon: <FaList />, category: "finanzas" },
  ];

  // Guardar filtros en localStorage
  useEffect(() => {
    localStorage.setItem("economicFilters", JSON.stringify(filters));
  }, [filters]);

  const capitalizeFirstLetter = (string) => {
    if (!string || string === "-") return string;
    return string
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };
  // Extraer conceptos únicos de payments
  useEffect(() => {
    if (payments) {
      const concepts = [...new Set(payments
        .map((p) => p.concept)
        .filter((c) => c && c.trim() !== "")
        .map((c) => c.trim().toLowerCase())
        .map((c) => capitalizeFirstLetter(c))
      )];
      setPaymentConceptsList(concepts);
    }
  }, [payments]);

  // Manejo de resize
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth <= 576) setIsMenuOpen(false);
      else setIsMenuOpen(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Carga de datos cada vez que cambie el rango de fechas
  useEffect(() => {
    if (auth === "admin") {
      Promise.all([
        fetchPaymentsByDateRange(dateRange.start, dateRange.end),
        getMotionsByDateRange(dateRange.start, dateRange.end),
        obtenerCuotasPorFechaRange(dateRange.start, dateRange.end)
      ]).catch(error => {
        console.error("Error al cargar datos por rango:", error);
      });
    }
  }, [auth, dateRange.start, dateRange.end, fetchPaymentsByDateRange, getMotionsByDateRange, obtenerCuotasPorFechaRange]);

  // Función helper para filtrar por fecha (nueva, para reutilizar)
  const isDateInRange = useCallback((movementDate) => {
    if (!movementDate) return false;
    const date = new Date(movementDate);
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    start.setHours(0, 0, 0, 0); // Reset a medianoche para comparación precisa
    end.setHours(23, 59, 59, 999); // Incluir todo el día final
    return date >= start && date <= end;
  }, [dateRange.start, dateRange.end]);

  // Combinar y filtrar datos (sin filtro de fecha, ya que el backend lo hace)
  const combineData = useCallback(() => {
    if (!payments || !motions || !cuotas || !estudiantes) {
      setData([]);
      return;
    }
    const seen = new Set();
    let allMovements = [];

    if (filters.includeCuotas) {
      allMovements.push(
        ...cuotas
          .map((c) => {
            const id = c._id;
            if (seen.has(id)) {
              return null;
            }
            seen.add(id);
            const paymentDate = c.paymentdate || c.date;
            if (!paymentDate) {
              return null;
            }
            const cuota = {
              ...c,
              type: "Cuota",
              name: c.student?._id ? `${c.student.name || ""} ${c.student.lastName || ""}`.trim() || "-" : "-",
              concept: "Cuota",
              paymentMethod: c.paymentmethod || "-",
              paymentDate,
              signedAmount: c.amount, // Positivo para ingresos
            };
            return cuota;
          })
          .filter((c) => c !== null)
      );
    }

    // Pagos (solo filtro por concepto si se incluyen)
    if (filters.includePagos) {
      allMovements.push(
        ...payments
          .filter((p) => {
            const concept = p.concept ? p.concept.trim().toLowerCase() : "";
            return filters.paymentConcepts.length === 0 ||
              filters.paymentConcepts.some((fc) => fc.toLowerCase() === concept);
          })
          .map((p) => {
            const student = estudiantes.find((s) => s._id === p.studentId);
            return {
              ...p,
              type: "Pago",
              name: student ? `${student.name || ""} ${student.lastName || ""}`.trim() || "-" : "-",
              concept: p.concept ? p.concept.trim() : "-",
              paymentMethod: p.paymentMethod || p.paymentmethod || "-",
              paymentDate: p.paymentDate || p.date,
              signedAmount: p.amount, // Positivo para ingresos
            };
          })
      );
    }

    // Ingresos y Egresos (solo filtro por tipo)
    allMovements.push(
      ...motions
        .filter((m) => {
          return (filters.includeIngresos && m.incomeType === "ingreso") ||
            (filters.includeEgresos && m.incomeType === "egreso");
        })
        .map((m) => ({
          ...m,
          type: m.incomeType === "ingreso" ? "Ingreso" : "Egreso",
          name: "-",
          concept: m.concept || m.conceptName || "-",
          paymentMethod: m.paymentMethod || "-",
          paymentDate: m.date,
          signedAmount: m.incomeType === "ingreso" ? m.amount : -m.amount, // Negativo para egresos
        }))
    );

    // Filtros por método, nombre Y FECHA (CAMBIO: Agregado filtro de fecha para todos los movimientos)
    const initialCount = allMovements.length;
    allMovements = allMovements.filter((m) => {
      if (!m.paymentDate && !m.date) {
        return false;
      }
      const movementDate = m.paymentDate || m.date; // Fecha del movimiento
      const inDateRange = isDateInRange(movementDate); // CAMBIO: Chequeo si está en el rango
      const inMethod = (filters.paymentMethod === "Ambos" ||
        (m.paymentMethod && m.paymentMethod.toLowerCase() === filters.paymentMethod.toLowerCase()));
      const inSearch = (debouncedSearchName === "" ||
        (m.name && m.name.toLowerCase().includes(debouncedSearchName.toLowerCase())));

   

      return inDateRange && inMethod && inSearch;
    });

    setData(allMovements);
  }, [payments, motions, cuotas, estudiantes, filters, debouncedSearchName, isDateInRange, dateRange.start, dateRange.end]); // CAMBIO: Agregadas dependencias para dateRange

  useEffect(() => {
    combineData();
  }, [combineData]);

  // Calcular desglosados
  const calculateBreakdown = () => {
    const breakdown = {
      cuotas: { total: 0, efectivo: 0, transferencia: 0 },
      pagos: {},
      ingresos: { total: 0, efectivo: 0, transferencia: 0 },
      egresos: { total: 0, efectivo: 0, transferencia: 0 },
    };

    data.forEach((m) => {
      const method = m.paymentMethod.toLowerCase();
      const amount = m.signedAmount || m.amount; // Usar signedAmount si existe

      if (m.type === "Cuota") {
        breakdown.cuotas.total += amount;
        if (method === "efectivo") breakdown.cuotas.efectivo += amount;
        if (method === "transferencia") breakdown.cuotas.transferencia += amount;
      } else if (m.type === "Pago") {
        const concept = capitalizeFirstLetter(m.concept || "Otros");
        if (!breakdown.pagos[concept]) {
          breakdown.pagos[concept] = { total: 0, efectivo: 0, transferencia: 0 };
        }
        breakdown.pagos[concept].total += amount;
        if (method === "efectivo") breakdown.pagos[concept].efectivo += amount;
        if (method === "transferencia") breakdown.pagos[concept].transferencia += amount;
      } else if (m.type === "Ingreso") {
        breakdown.ingresos.total += amount;
        if (method === "efectivo") breakdown.ingresos.efectivo += amount;
        if (method === "transferencia") breakdown.ingresos.transferencia += amount;
      } else if (m.type === "Egreso") {
        breakdown.egresos.total += Math.abs(amount); // Total egresos positivo para display
        if (method === "efectivo") breakdown.egresos.efectivo += Math.abs(amount);
        if (method === "transferencia") breakdown.egresos.transferencia += Math.abs(amount);
      }
    });

    return breakdown;
  };

  const breakdown = calculateBreakdown();

  const netTotal = data.reduce((sum, m) => sum + (m.signedAmount || m.amount), 0);

  // Handlers para filtros
  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const handleQuickRange = (range) => {
    const today = new Date();
    let start = today;
    let end = today;
    if (range === "week") {
      start = new Date(today.setDate(today.getDate() - today.getDay()));
      end = new Date(today.setDate(start.getDate() + 6));
    } else if (range === "month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (range === "today") {
      start = today;
      end = today;
    }
    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFilters({ ...filters, [name]: checked });
    } else if (name === "paymentConcepts") {
      setFilters({
        ...filters,
        paymentConcepts: value === "Todos" ? [] : [value],
      });
    } else {
      setFilters({ ...filters, [name]: value });
    }
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      includeCuotas: true,
      includePagos: true,
      paymentConcepts: [],
      includeIngresos: true,
      includeEgresos: true,
      paymentMethod: "Ambos",
    });
    setSearchName("");
    setCurrentPage(1);
  };

  // Exportar a Excel (actualizado para manejar signedAmount)
  const handleExportExcel = () => {
    const exportData = [
    ...data.map((m) => ({
      Fecha: new Date(new Date(m.paymentDate || m.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString(
        "es-ES",
        { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }
      ),
      Concepto: capitalizeFirstLetter(m.concept || "-"),
      Monto: m.signedAmount || m.amount,
      Método: capitalizeFirstLetter(m.paymentMethod || "-"),
      Tipo: capitalizeFirstLetter(m.type || "-"),
      Nombre: capitalizeFirstLetter(m.name || "-"),
    })),
    {
      Fecha: "Neto",
      Concepto: "",
      Monto: netTotal,
      Método: "",
      Tipo: "",
      Nombre: "",
    },
  ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "e31fa8" } }, border: { style: "thin" }, alignment: { horizontal: "center" } };
    const cellStyle = { border: { style: "thin" }, alignment: { horizontal: "left" } };
    const totalRowStyle = { font: { bold: true }, fill: { fgColor: { rgb: "D3D3D3" } }, border: { style: "thin" }, alignment: { horizontal: "left" } };

    const headers = ["Fecha", "Concepto", "Monto", "Método", "Tipo", "Nombre"];
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    });

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = row === range.e.r ? totalRowStyle : cellStyle;
          if (ws[cellRef].v && headers[col] === "Monto") ws[cellRef].z = "$#,##0";
        }
      }
    }

    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, `Movimientos_${dateRange.start}_al_${dateRange.end}.xlsx`);
  };

  const handleLogout = () => {
    navigate("/login");
    setIsMenuOpen(false);
  };



  // Paginación
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const isLoading = loadingPayments || loadingMotions || loadingCuotas;

  return (
    <div className={`app-container ${windowWidth <= 576 ? "mobile-view" : ""}`}>
      {windowWidth <= 576 && <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />}
      {windowWidth > 576 && (
        <header className="desktop-nav-header">
          <div className="header-logo-setting" onClick={() => navigate("/")}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image" />
          </div>
          <div className="nav-right-section">
            <div className="profile-container" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">Hola, {userData?.name || "Usuario"}</span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? "rotated" : ""}`} />
              {isProfileOpen && (
                <div className="profile-menu">
                  <div className="menu-option" onClick={() => { navigate("/user"); setIsProfileOpen(false); }}>
                    <FaUserCog /> Mi Perfil
                  </div>
                  <div className="menu-option" onClick={() => { navigate("/settings"); setIsProfileOpen(false); }}>
                    <FaCog /> Configuración
                  </div>
                  <div className="menu-separator"></div>
                  <div className="menu-option logout-option" onClick={() => { handleLogout(); setIsProfileOpen(false); }}>
                    <FaUserCircle /> Cerrar Sesión
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
            <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <ul className="sidebar-menu">
              {menuItems.map((item, index) => (
                <li key={index} className="sidebar-menu-item" onClick={() => (item.action ? item.action() : navigate(item.route))}>
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-text">{item.name}</span>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="main-content">
          <div className="welcome-text">
            <h1>Movimientos Económicos</h1>
          </div>
           <div className="stats-grid">
                <div className="stat-card">
                  <h3 className="titulo-card color-card">Alumnos Activos</h3>
                  <p className="stat-value">{countStudentsByState('Activo') || 0}</p>
                </div>
                <div className="stat-card">
                  <h3 className="titulo-card color-card">Alumnos Inactivos</h3>
                  <p className="stat-value">{countStudentsByState('Inactivo') || 0}</p>
                </div>
                <div className="stat-card">
                  <h3 className="titulo-card color-card">Cuotas Pendientes</h3>
                  <p className="stat-value">{cuotasStatusCount.pendientes}</p>
                </div>
                <div className="stat-card">
                  <h3 className="titulo-card color-card">Cuotas Vencidas</h3>
                  <p className="stat-value">{cuotasStatusCount.vencidas}</p>
                </div>
              </div>
          <div className="filter-section-economic">
            <div className="filter-group">
              <h3>Rango de Fechas</h3>
              <div className="date-inputs">
                <label>
                  Desde:
                  <input
                    type="date"
                    name="start"
                    value={dateRange.start}
                    onChange={handleDateChange}
                    max={dateRange.end}
                    disabled={isLoading}
                  />
                </label>
                <label>
                  Hasta:
                  <input
                    type="date"
                    name="end"
                    value={dateRange.end}
                    onChange={handleDateChange}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={isLoading}
                  />
                </label>
                <div className="quick-ranges">
                  <button className="quick-range-btn" onClick={() => handleQuickRange("today")} disabled={isLoading}>
                    Hoy
                  </button>
                  <button className="quick-range-btn" onClick={() => handleQuickRange("week")} disabled={isLoading}>
                    Esta Semana
                  </button>
                  <button className="quick-range-btn" onClick={() => handleQuickRange("month")} disabled={isLoading}>
                    Este Mes
                  </button>
                </div>
              </div>
            </div>
            <div className="filter-group">
              <h3>Tipos de Movimientos</h3>
              <label>
                <input
                  type="checkbox"
                  name="includeCuotas"
                  checked={filters.includeCuotas}
                  onChange={handleFilterChange}
                  disabled={isLoading}
                />
                Incluir Cuotas
              </label>
              <label>
                <input
                  type="checkbox"
                  name="includePagos"
                  checked={filters.includePagos}
                  onChange={handleFilterChange}
                  disabled={isLoading}
                />
                Incluir Pagos
              </label>
              {filters.includePagos && (
                <label>
                  Concepto de Pagos:
                  <select
                    name="paymentConcepts"
                    value={filters.paymentConcepts[0] || "Todos"}
                    onChange={handleFilterChange}
                    disabled={isLoading}
                  >
                    <option value="Todos">Todos</option>
                    {paymentConceptsList.map((concept) => (
                      <option key={concept} value={concept}>
                        {concept}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <input
                  type="checkbox"
                  name="includeIngresos"
                  checked={filters.includeIngresos}
                  onChange={handleFilterChange}
                  disabled={isLoading}
                />
                Incluir Ingresos
              </label>
              <label>
                <input
                  type="checkbox"
                  name="includeEgresos"
                  checked={filters.includeEgresos}
                  onChange={handleFilterChange}
                  disabled={isLoading}
                />
                Incluir Egresos
              </label>
            </div>
            <div className="filter-group">
              <h3>Método de Pago</h3>
              <select
                name="paymentMethod"
                value={filters.paymentMethod}
                onChange={handleFilterChange}
                disabled={isLoading}
              >
                <option value="Ambos">Ambos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            
            <div className="filter-group">
              <h3>Buscar por Nombre</h3>
              <div className="search-input">
                <FaSearch />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Buscar por nombre..."
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="filter-actions">
              <button className="quick-range-btn" onClick={resetFilters} disabled={isLoading}>
                Resetear Filtros
              </button>
              <button className="export-btn" onClick={handleExportExcel} disabled={isLoading || data.length === 0}>
                <FaFileExport /> Exportar a Excel
              </button>
            </div>
          </div>
          <div className="summary-section">
            
            <p><span role="img" aria-label="neto">💰</span> <strong>Total Neto:</strong> ${netTotal.toLocaleString("es-ES")}</p>
            <p><span role="img" aria-label="ingresos">⬆️</span> <strong>Total Ingresos:</strong> ${ (breakdown.cuotas.total + Object.values(breakdown.pagos).reduce((sum, c) => sum + c.total, 0) + breakdown.ingresos.total).toLocaleString("es-ES") }</p>
            <p><span role="img" aria-label="egresos">⬇️</span> <strong>Total Egresos:</strong> ${ breakdown.egresos.total.toLocaleString("es-ES") }</p>
            <p><span role="img" aria-label="efectivo">💵</span> <strong>Total Efectivo:</strong> ${ (breakdown.cuotas.efectivo + Object.values(breakdown.pagos).reduce((sum, c) => sum + c.efectivo, 0) + breakdown.ingresos.efectivo).toLocaleString("es-ES") }</p>
            <p><span role="img" aria-label="transferencia">💳</span> <strong>Total Transferencia:</strong> ${ (breakdown.cuotas.transferencia + Object.values(breakdown.pagos).reduce((sum, c) => sum + c.transferencia, 0) + breakdown.ingresos.transferencia).toLocaleString("es-ES") }</p>
          </div>
          <div className="breakdown-section">
            <div>
              <h3><span role="img" aria-label="cuotas">🧾</span> Cuotas</h3>
              <p><strong>Total:</strong> <span role="img" aria-label="dinero">💵</span> ${breakdown.cuotas.total.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="efectivo">💵</span> Efectivo: ${breakdown.cuotas.efectivo.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="transferencia">💳</span> Transferencia: ${breakdown.cuotas.transferencia.toLocaleString("es-ES")}</p>
            </div>
            <div>
              <h3><span role="img" aria-label="pagos">💸</span> Pagos por Concepto</h3>
              {Object.entries(breakdown.pagos).length === 0 && <p style={{color:'#bdbdbd'}}>Sin pagos registrados</p>}
              {Object.entries(breakdown.pagos).map(([concept, values]) => (
                <div key={concept} style={{marginBottom:8}}>
                  <h4><span role="img" aria-label="concepto">🏷️</span> {concept}</h4>
                  <p><strong>Total:</strong> <span role="img" aria-label="dinero">💵</span> ${values.total.toLocaleString("es-ES")}</p>
                  <p><span role="img" aria-label="efectivo">💵</span> Efectivo: ${values.efectivo.toLocaleString("es-ES")}</p>
                  <p><span role="img" aria-label="transferencia">💳</span> Transferencia: ${values.transferencia.toLocaleString("es-ES")}</p>
                </div>
              ))}
            </div>
            <div>
              <h3><span role="img" aria-label="ingresos">⬆️</span> Ingresos</h3>
              <p><strong>Total:</strong> <span role="img" aria-label="dinero">💵</span> ${breakdown.ingresos.total.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="efectivo">💵</span> Efectivo: ${breakdown.ingresos.efectivo.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="transferencia">💳</span> Transferencia: ${breakdown.ingresos.transferencia.toLocaleString("es-ES")}</p>
            </div>
            <div>
              <h3><span role="img" aria-label="egresos">⬇️</span> Egresos</h3>
              <p><strong>Total:</strong> <span role="img" aria-label="dinero">💵</span> ${breakdown.egresos.total.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="efectivo">💵</span> Efectivo: ${breakdown.egresos.efectivo.toLocaleString("es-ES")}</p>
              <p><span role="img" aria-label="transferencia">💳</span> Transferencia: ${breakdown.egresos.transferencia.toLocaleString("es-ES")}</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="economic-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Tipo</th>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  <>
                    {paginatedData.map((item, index) => (
                      <tr key={index}>
                   
                          <td>
                            {new Date(new Date(item.paymentDate || item.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString(
                              "es-ES",
                              { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }
                            )}
                          </td>
                        
                        <td>{capitalizeFirstLetter(item.concept || "-")}</td>
                        <td>${(item.signedAmount || item.amount).toLocaleString("es-ES")}</td>
                        <td>{capitalizeFirstLetter(item.paymentMethod || "-")}</td>
                        <td>{capitalizeFirstLetter(item.type || "-")}</td>
                        <td>{capitalizeFirstLetter(item.name || "-")}</td>
                      </tr>
                    ))}
                    <tr className="summary-row">
                      <td>Neto</td>
                      <td></td>
                     
                        <td>${netTotal.toLocaleString("es-ES")}</td>
                   
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </>
                ) : (
                  <tr className="empty-table-row">
                    <td colSpan={6} className="empty-table-message">
                      {isLoading ? "Cargando movimientos..." : "No hay movimientos para los filtros seleccionados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
     
        </div>
      </div>

  );
};

export default EconomicMovements;