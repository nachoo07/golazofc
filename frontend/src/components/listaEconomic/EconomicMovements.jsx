import React, { useState, useContext, useEffect, useCallback, useMemo, useRef } from "react";
import { FaUsers, FaClock, FaExclamationTriangle, FaUser, FaFileExport, FaSearch, FaMoneyBillWave, FaChartLine,
  FaWallet, FaCoins, FaExchangeAlt, FaRegDotCircle, FaReceipt } from "react-icons/fa";
import { PaymentContext } from "../../context/payment/PaymentContext";
import { MotionContext } from "../../context/motion/MotionContext";
import { SharesContext } from "../../context/share/ShareContext";
import { LoginContext } from "../../context/login/LoginContext";
import { StudentsContext } from "../../context/student/StudentContext";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';
import * as XLSX from "xlsx-js-style";
import "./economicMovements.css";
import Pagination from "../pagination/Pagination";
import DesktopNavbar from "../navbar/DesktopNavbar";
import Sidebar from "../sidebar/Sidebar";

const MOVEMENT_OPTIONS = [
  { value: "Cuota", label: "Cuotas" },
  { value: "Pago", label: "Pagos" },
  { value: "Ingreso", label: "Ingresos" },
  { value: "Egreso", label: "Egresos" },
];
const ALL_MOVEMENT_VALUES = MOVEMENT_OPTIONS.map((option) => option.value);

// Hook para debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const toInputDate = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (dateValue) => {
  if (!dateValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getInitialDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date();
  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
};

const getInitialFilters = () => {
  const fallback = {
    movementTypes: ALL_MOVEMENT_VALUES,
    paymentConcepts: [],
    paymentMethod: "Ambos",
  };

  try {
    const saved = JSON.parse(localStorage.getItem("economicFilters") || "{}");

    const rawMovementTypes = Array.isArray(saved.movementTypes)
      ? saved.movementTypes
      : saved.movementType
        ? [saved.movementType]
        : fallback.movementTypes;
    const movementTypes = [...new Set(rawMovementTypes.filter((item) => ALL_MOVEMENT_VALUES.includes(item)))];

    const paymentConcepts = Array.isArray(saved.paymentConcepts)
      ? saved.paymentConcepts
      : saved.paymentConcept && saved.paymentConcept !== "Todos"
        ? [saved.paymentConcept]
        : [];

    return {
      movementTypes: movementTypes.length > 0 ? movementTypes : ALL_MOVEMENT_VALUES,
      paymentConcepts,
      paymentMethod: saved.paymentMethod || "Ambos",
    };
  } catch {
    return fallback;
  }
};

const formatDateAR = (dateValue) => {
  const parsed = parseLocalDate(dateValue);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatShortDate = (dateValue) => {
  const parsed = parseLocalDate(dateValue);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
};

const formatMoney = (value) => `$${Number(value || 0).toLocaleString("es-ES")}`;

const EconomicMovements = () => {
  const { payments, fetchPaymentsByDateRange, loading: loadingPayments } = useContext(PaymentContext);
  const { motions, getMotionsByDateRange, loading: loadingMotions } = useContext(MotionContext);
  const { cuotas, obtenerCuotasPorFechaRange, loading: loadingCuotas, cuotasStatusCount } = useContext(SharesContext);
  const { auth } = useContext(LoginContext);
  const { estudiantes, countStudentsByState, obtenerEstudiantes } = useContext(StudentsContext);

  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [filters, setFilters] = useState(getInitialFilters);
  const [searchName, setSearchName] = useState("");
  const [paymentConceptsList, setPaymentConceptsList] = useState([]); // Lista dinámica de conceptos
  const debouncedSearchName = useDebounce(searchName, 300);
  const [data, setData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const todayInput = useMemo(() => toInputDate(new Date()), []);
  const movementDropdownRef = useRef(null);
  const conceptDropdownRef = useRef(null);

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
      const concepts =
        [...new Set(payments
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
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const closeDropdownsOnOutsideClick = (event) => {
      [movementDropdownRef, conceptDropdownRef].forEach((ref) => {
        if (ref.current?.open && !ref.current.contains(event.target)) {
          ref.current.removeAttribute("open");
        }
      });
    };

    document.addEventListener("mousedown", closeDropdownsOnOutsideClick);
    document.addEventListener("touchstart", closeDropdownsOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeDropdownsOnOutsideClick);
      document.removeEventListener("touchstart", closeDropdownsOnOutsideClick);
    };
  }, []);

  // Carga de datos cada vez que cambie el rango de fechas
  useEffect(() => {
    if (auth === "admin") {
      Promise.all([
        fetchPaymentsByDateRange(dateRange.start, dateRange.end),
        getMotionsByDateRange(dateRange.start, dateRange.end),
        obtenerCuotasPorFechaRange(dateRange.start, dateRange.end),
      ]).catch((error) => {
        console.error("Error al cargar datos por rango:", error);
      });
    }
  }, [auth, dateRange.start, dateRange.end, fetchPaymentsByDateRange, getMotionsByDateRange, obtenerCuotasPorFechaRange]);

  useEffect(() => {
    if (auth === "admin") {
      obtenerEstudiantes();
    }
  }, [auth, obtenerEstudiantes]);

  // Función helper para filtrar por fecha (nueva, para reutilizar)
  const isDateInRange = useCallback(
    (movementDate) => {
      const date = parseLocalDate(movementDate);
      if (!date) return false;
      const start = parseLocalDate(dateRange.start);
      const end = parseLocalDate(dateRange.end);
      if (!start || !end) return false;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    },
    [dateRange.start, dateRange.end]
  );

  const movementConfig = useMemo(() => {
    return {
      includeCuotas: filters.movementTypes.includes("Cuota"),
      includePagos: filters.movementTypes.includes("Pago"),
      includeIngresos: filters.movementTypes.includes("Ingreso"),
      includeEgresos: filters.movementTypes.includes("Egreso"),
    };
  }, [filters.movementTypes]);

  // Combinar y filtrar datos (sin filtro de fecha, ya que el backend lo hace)
  const combineData = useCallback(() => {
    if (!payments || !motions || !cuotas || !estudiantes) {
      setData([]);
      return;
    }
    const seen = new Set();
    let allMovements = [];

    if (movementConfig.includeCuotas) {
      allMovements.push(
        ...cuotas
          .map((c) => {
            const id = c._id;
            if (seen.has(id)) return null;
            seen.add(id);
            const paymentDate = c.paymentdate || c.date;
            if (!paymentDate) return null;

            return {
              ...c,
              type: "Cuota",
              name: c.student?._id ? `${c.student.name || ""} ${c.student.lastName || ""}`.trim() || "-" : "-",
              concept: "Cuota",
              paymentMethod: c.paymentmethod || "-",
              paymentDate,
              signedAmount: c.amount, // Positivo para ingresos
            };
          })
          .filter((c) => c !== null)
      );
    }
    // Pagos (solo filtro por concepto si se incluyen)
    if (movementConfig.includePagos) {
      allMovements.push(
        ...payments
          .filter((p) => {
            if (filters.paymentConcepts.length === 0) return true;
            const concept = p.concept ? p.concept.trim().toLowerCase() : "";
            return filters.paymentConcepts.includes(concept)
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
          return (movementConfig.includeIngresos && m.incomeType === "ingreso") ||
            (movementConfig.includeEgresos && m.incomeType === "egreso");
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

    allMovements = allMovements.filter((m) => {
      if (!m.paymentDate && !m.date) return false;
      const movementDate = m.paymentDate || m.date; // Fecha del movimiento
      const inDateRange = isDateInRange(movementDate); // CAMBIO: Chequeo si está en el rango
      const inMethod = (filters.paymentMethod === "Ambos" ||
        (m.paymentMethod && m.paymentMethod.toLowerCase() === filters.paymentMethod.toLowerCase()));
      const inSearch = debouncedSearchName === "" ||
        (m.name && m.name.toLowerCase().includes(debouncedSearchName.toLowerCase()));

      return inDateRange && inMethod && inSearch;
    });

    allMovements.sort((a, b) => new Date(b.paymentDate || b.date) - new Date(a.paymentDate || a.date));
    setData(allMovements);
  }, [payments, motions, cuotas, estudiantes, movementConfig, filters.paymentConcepts, filters.paymentMethod, debouncedSearchName, isDateInRange]); // CAMBIO: Agregadas dependencias para dateRange

  useEffect(() => {
    combineData();
  }, [combineData]);

  // Calcular desglosados
  const breakdown = useMemo(() => {
    const nextBreakdown = {
      cuotas: { total: 0, efectivo: 0, transferencia: 0 },
      pagos: {},
      ingresos: { total: 0, efectivo: 0, transferencia: 0 },
      egresos: { total: 0, efectivo: 0, transferencia: 0 },
    };

    data.forEach((m) => {
      const method = String(m.paymentMethod || "").toLowerCase();
      const amount = Number(m.signedAmount ?? m.amount ?? 0);

      if (m.type === "Cuota") {
        nextBreakdown.cuotas.total += amount;
        if (method === "efectivo") nextBreakdown.cuotas.efectivo += amount;
        if (method === "transferencia") nextBreakdown.cuotas.transferencia += amount;
      } else if (m.type === "Pago") {
        const concept = capitalizeFirstLetter(m.concept || "Otros");
        if (!nextBreakdown.pagos[concept]) {
          nextBreakdown.pagos[concept] = { total: 0, efectivo: 0, transferencia: 0 };
        }
        nextBreakdown.pagos[concept].total += amount;
        if (method === "efectivo") nextBreakdown.pagos[concept].efectivo += amount;
        if (method === "transferencia") nextBreakdown.pagos[concept].transferencia += amount;
      } else if (m.type === "Ingreso") {
        nextBreakdown.ingresos.total += amount;
        if (method === "efectivo") nextBreakdown.ingresos.efectivo += amount;
        if (method === "transferencia") nextBreakdown.ingresos.transferencia += amount;
      } else if (m.type === "Egreso") {
        const absoluteAmount = Math.abs(amount);
        nextBreakdown.egresos.total += absoluteAmount;
        if (method === "efectivo") nextBreakdown.egresos.efectivo += absoluteAmount;
        if (method === "transferencia") nextBreakdown.egresos.transferencia += absoluteAmount;
      }
    });

    return nextBreakdown;
  }, [data]);

  const netTotal = useMemo(() => data.reduce((sum, m) => sum + Number(m.signedAmount ?? m.amount ?? 0), 0), [data]);

  const totalIngresos = useMemo(() => {
    return (
      breakdown.cuotas.total +
      Object.values(breakdown.pagos).reduce((sum, concept) => sum + concept.total, 0) +
      breakdown.ingresos.total
    );
  }, [breakdown]);

  const totalEgresos = useMemo(() => breakdown.egresos.total, [breakdown]);

  const totalEfectivo = useMemo(() => {
    return (
      breakdown.cuotas.efectivo +
      Object.values(breakdown.pagos).reduce((sum, concept) => sum + concept.efectivo, 0) +
      breakdown.ingresos.efectivo
    );
  }, [breakdown]);

  const totalTransferencia = useMemo(() => {
    return (
      breakdown.cuotas.transferencia +
      Object.values(breakdown.pagos).reduce((sum, concept) => sum + concept.transferencia, 0) +
      breakdown.ingresos.transferencia
    );
  }, [breakdown]);

  const movementLabel = useMemo(() => {
    if (filters.movementTypes.length === MOVEMENT_OPTIONS.length) return "Todos";
    if (filters.movementTypes.length === 0) return "Ninguno";

    return MOVEMENT_OPTIONS
      .filter((option) => filters.movementTypes.includes(option.value))
      .map((option) => option.label)
      .join(", ");
  }, [filters.movementTypes]);

  const conceptLabel = useMemo(() => {
    if (filters.paymentConcepts.length === 0) return "Todos";
    return filters.paymentConcepts.join(", ");
  }, [filters.paymentConcepts]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (filters.paymentMethod !== "Ambos") chips.push(`Método: ${filters.paymentMethod}`);
    if (filters.movementTypes.length !== MOVEMENT_OPTIONS.length) chips.push(`Movimientos: ${movementLabel}`);
    if (filters.paymentConcepts.length > 0) chips.push(`Conceptos: ${conceptLabel}`);
    if (debouncedSearchName.trim()) chips.push(`Búsqueda: ${debouncedSearchName.trim()}`);

    return chips;
  }, [filters, movementLabel, conceptLabel, debouncedSearchName]);

  const orderedPaymentConceptBreakdown = useMemo(() => {
    return Object.entries(breakdown.pagos).sort((a, b) => b[1].total - a[1].total);
  }, [breakdown.pagos]);

  // Handlers para filtros
  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value });
    setCurrentPage(1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const toggleMovementType = (movementType) => {
    setFilters((prev) => {
      const exists = prev.movementTypes.includes(movementType);
      const nextMovementTypes = exists
        ? prev.movementTypes.filter((item) => item !== movementType)
        : [...prev.movementTypes, movementType];
      const movementTypes = nextMovementTypes.length === 0 ? ALL_MOVEMENT_VALUES : nextMovementTypes;
      return {
        ...prev,
        movementTypes,
      };
    });
    setCurrentPage(1);
  };

  const toggleAllMovementTypes = () => {
    setFilters((prev) => ({ ...prev, movementTypes: ALL_MOVEMENT_VALUES }));
    setCurrentPage(1);
  };

  const togglePaymentConcept = (concept) => {
    setFilters((prev) => {
      const exists = prev.paymentConcepts.includes(concept);
      const paymentConcepts = exists
        ? prev.paymentConcepts.filter((item) => item !== concept)
        : [...prev.paymentConcepts, concept];

      return {
        ...prev,
        paymentConcepts,
      };
    });
    setCurrentPage(1);
  };

  const clearPaymentConcepts = () => {
    setFilters((prev) => ({ ...prev, paymentConcepts: [] }));
    setCurrentPage(1);
  };
  // Exportar a Excel (actualizado para manejar signedAmount)
  const handleExportExcel = () => {
    const exportData = [
      ...data.map((m) => ({
        Fecha: formatDateAR(m.paymentDate || m.date),
        Monto: m.signedAmount || m.amount,
        Método: capitalizeFirstLetter(m.paymentMethod || "-"),
        Pago:
          m.type === "Cuota"
            ? "Cuota"
            : m.type === "Pago"
              ? capitalizeFirstLetter(m.concept || "Otros")
              : capitalizeFirstLetter(m.type || "-"),
        Nombre: capitalizeFirstLetter(m.name || "-"),
      })),
      {
        Fecha: "Neto",
        Monto: netTotal,
        Método: "",
        Pago: "",
        Nombre: "",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "e31fa8" } },
      border: { style: "thin" },
      alignment: { horizontal: "center" },
    };
    const cellStyle = { border: { style: "thin" }, alignment: { horizontal: "left" } };
    const totalRowStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "D3D3D3" } },
      border: { style: "thin" },
      alignment: { horizontal: "left" },
    };

    const headers = ["Fecha", "Monto", "Método", "Pago", "Nombre"];
    headers.forEach((header, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    });

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let row = 1; row <= range.e.r; row += 1) {
      for (let col = 0; col <= range.e.c; col += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellRef]) continue;

        ws[cellRef].s = row === range.e.r ? totalRowStyle : cellStyle;
        if (ws[cellRef].v && headers[col] === "Monto") ws[cellRef].z = "$#,##0";
      }
    }

    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, `Movimientos_${dateRange.start}_al_${dateRange.end}.xlsx`);
  };

  // Paginación
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const isLoading = loadingPayments || loadingMotions || loadingCuotas;

  return (
    <div className={`app-container economic-page ${windowWidth <= 576 ? "mobile-view" : ""}`}>
      {windowWidth <= 576 && (
        <AppNavbar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          searchQuery={searchName}
          setSearchQuery={setSearchName}
        />
      )}
      {windowWidth > 576 && <DesktopNavbar logoSrc={logo} />}
      <div className="dashboard-layout">
        <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} activeRoute="/listeconomic" />
        <main className="main-content">
          <section className="stats-grid">
            <article className="stat-card pending-card">
              <div className="pending-icon-wrap" aria-hidden="true">
                <FaUsers className="pending-big-icon" />
              </div>
              <div className="pending-content">
                <h3 className="titulo-card">Alumnos Activos</h3>
                <p className="stat-value">{countStudentsByState("Activo") || 0}</p>
              </div>
            </article>
            <article className="stat-card pending-card">
              <div className="pending-icon-wrap" aria-hidden="true">
                <FaClock className="pending-big-icon" />
              </div>
              <div className="pending-content">
                <h3 className="titulo-card">Cuotas Pendientes</h3>
                <p className="stat-value">{cuotasStatusCount.pendientes}</p>
              </div>
            </article>
            <article className="stat-card pending-card">
              <div className="pending-icon-wrap" aria-hidden="true">
                <FaExclamationTriangle className="pending-big-icon" />
              </div>
              <div className="pending-content">
                <h3 className="titulo-card">Cuotas Vencidas</h3>
                <p className="stat-value">{cuotasStatusCount.vencidas}</p>
              </div>
            </article>
            <article className="stat-card pending-card">
              <div className="pending-icon-wrap" aria-hidden="true">
                <FaUser className="pending-big-icon" />
              </div>
              <div className="pending-content">
                <h3 className="titulo-card">Alumnos Inactivos</h3>
                <p className="stat-value">{countStudentsByState("Inactivo") || 0}</p>
              </div>
            </article>
          </section>
          <section className="summary-section-main">
            <div className="summary-topline">
              <FaRegDotCircle className="summary-dot-icon" />
              <span>
                Período mostrado: <strong>{formatShortDate(dateRange.start)} → {formatShortDate(dateRange.end)}</strong>
                {" | "}
                Movimientos: <strong>{data.length}</strong>
              </span>
            </div>
            <div className="summary-cards-grid">
              <article className="summary-metric-card">
                <FaMoneyBillWave className="summary-metric-icon" />
                <div className="summary-metric-content">
                  <h4>Total Neto</h4>
                  <p>{formatMoney(netTotal)}</p>
                </div>
              </article>
              <article className="summary-metric-card">
                <FaChartLine className="summary-metric-icon" />
                <div className="summary-metric-content">
                  <h4>Total Ingresos</h4>
                  <p>{formatMoney(totalIngresos)}</p>
                </div>
              </article>
              <article className="summary-metric-card">
                <FaWallet className="summary-metric-icon" />
                <div className="summary-metric-content">
                  <h4>Total Egresos</h4>
                  <p>{formatMoney(totalEgresos)}</p>
                </div>
              </article>
              <article className="summary-metric-card">
                <FaCoins className="summary-metric-icon" />
                <div className="summary-metric-content">
                  <h4>Total Efectivo</h4>
                  <p>{formatMoney(totalEfectivo)}</p>
                </div>
              </article>
              <article className="summary-metric-card">
                <FaExchangeAlt className="summary-metric-icon" />
                <div className="summary-metric-content">
                  <h4>Total Transferencia</h4>
                  <p>{formatMoney(totalTransferencia)}</p>
                </div>
              </article>
            </div>
          </section>
          <section className="breakdown-grid">
            <article className="breakdown-card">
              <h3>Desglose por Categoría</h3>
              <div className="breakdown-line">
                <span>Cuotas</span>
                <strong>{formatMoney(breakdown.cuotas.total)}</strong>
              </div>
              <div className="breakdown-line">
                <span>Pagos</span>
                <strong>{formatMoney(Object.values(breakdown.pagos).reduce((sum, item) => sum + item.total, 0))}</strong>
              </div>
              <div className="breakdown-line">
                <span>Ingresos</span>
                <strong>{formatMoney(breakdown.ingresos.total)}</strong>
              </div>
              <div className="breakdown-line">
                <span>Egresos</span>
                <strong>{formatMoney(breakdown.egresos.total)}</strong>
              </div>
            </article>

            <article className="breakdown-card concepts-breakdown">
              <h3>
                <FaReceipt /> Pagos por Concepto
              </h3>
              {orderedPaymentConceptBreakdown.length > 0 ? (
                <div className="concept-breakdown-list">
                  {orderedPaymentConceptBreakdown.map(([concept, values]) => (
                    <div key={concept} className="concept-breakdown-item">
                      <div className="concept-main-row">
                        <span>{concept}</span>
                        <strong>{formatMoney(values.total)}</strong>
                      </div>
                      <div className="concept-sub-row">
                        <span>Efectivo: {formatMoney(values.efectivo)}</span>
                        <span>Transferencia: {formatMoney(values.transferencia)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="breakdown-empty">No hay pagos por concepto en este rango.</p>
              )}
            </article>
          </section>
          <section className="table-filters-panel">
            <div className="table-filters-grid">
              <label className="control-field">
                <span>Desde</span>
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateChange}
                  max={dateRange.end}
                  disabled={isLoading}
                />
              </label>
              <label className="control-field">
                <span>Hasta</span>
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateChange}
                  max={todayInput}
                  disabled={isLoading}
                />
              </label>
              <label className="control-field">
                <span>Método</span>
                <select name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange} disabled={isLoading}>
                  <option value="Ambos">Ambos</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </label>
              <div className="control-field">
                <span>Movimientos</span>
                <details className="multi-select-dropdown" ref={movementDropdownRef}>
                  <summary>{movementLabel}</summary>
                  <div className="multi-select-options">
                    <label className="option-checkbox option-all">
                      <input
                        type="checkbox"
                        checked={filters.movementTypes.length === MOVEMENT_OPTIONS.length}
                        onChange={toggleAllMovementTypes}
                        disabled={isLoading}
                      />
                      <span>Todos</span>
                    </label>
                    {MOVEMENT_OPTIONS.map((option) => (
                      <label key={option.value} className="option-checkbox">
                        <input
                          type="checkbox"
                          checked={filters.movementTypes.includes(option.value)}
                          onChange={() => toggleMovementType(option.value)}
                          disabled={isLoading}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
              <div className="control-field">
                <span>Conceptos</span>
                <details className="multi-select-dropdown" ref={conceptDropdownRef}>
                  <summary>{conceptLabel}</summary>
                  <div className="multi-select-options">
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.paymentConcepts.length === 0}
                        onChange={clearPaymentConcepts}
                        disabled={isLoading}
                      />
                      <span>Todos</span>
                    </label>
                    {paymentConceptsList.map((concept) => (
                      <label key={concept} className="option-checkbox">
                        <input
                          type="checkbox"
                          checked={filters.paymentConcepts.includes(concept)}
                          onChange={() => togglePaymentConcept(concept)}
                          disabled={isLoading}
                        />
                        <span>{concept}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>
            <div className="table-filters-bottom-row">
              <div className="period-inline">
                <FaRegDotCircle className="summary-dot-icon" />
                <span>
                  Período: <strong>{formatDateAR(dateRange.start)} → {formatDateAR(dateRange.end)}</strong>
                </span>
              </div>
              <div className="search-export-row">
                <label className="control-field search-field-inline">

                  <div className="search-input wide">
                    <FaSearch />
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Buscar por nombre..."
                      disabled={isLoading}
                    />
                  </div>
                </label>
                <button
                  className="table-export-btn"
                  onClick={handleExportExcel}
                  disabled={isLoading || data.length === 0}
                  type="button"
                  title="Exportar a Excel"
                >
                  <FaFileExport /> Exportar
                </button>
              </div>
            </div>
            <div className="active-filters-row">
              {activeFilterChips.map((chip) => (
                <span key={chip} className="filter-chip">
                  {chip}
                </span>
              ))}
            </div>
          </section>
          <section className="table-wrapper">
            <table className="economic-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Tipo / Concepto</th>
                  <th>Alumno</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length > 0 ? (
                  <>
                    {paginatedData.map((item, index) => (
                      <tr key={`${item._id || item.id || "mov"}-${index}`}>
                        <td>{formatDateAR(item.paymentDate || item.date)}</td>
                        <td>{formatMoney(item.signedAmount || item.amount)}</td>
                        <td>{capitalizeFirstLetter(item.paymentMethod || "-")}</td>
                        <td>
                          {item.type === "Cuota"
                            ? "Cuota"
                            : item.type === "Pago"
                              ? capitalizeFirstLetter(item.concept || "Otros")
                              : capitalizeFirstLetter(item.type || "-")}
                        </td>
                        <td>{capitalizeFirstLetter(item.name || "-")}</td>
                      </tr>
                    ))}
                    <tr className="summary-row">
                      <td>Neto</td>
                      <td>{formatMoney(netTotal)}</td>
                      <td />
                      <td />
                      <td />
                    </tr>
                  </>
                ) : (
                  <tr className="empty-table-row">
                    <td colSpan={5} className="empty-table-message">
                      {isLoading ? "Cargando movimientos..." : "No hay movimientos para los filtros seleccionados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            disabled={isLoading}
            showNumbers
            showSummary
            prevLabel="Anterior"
            nextLabel="Siguiente"
            hideIfSinglePage={false}
            buttonClassName=""
          />
        </main>
      </div>
    </div>
  );
};

export default EconomicMovements;
