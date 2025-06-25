import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBars, FaUsers, FaList, FaTimes, FaChartBar, FaHome, FaMoneyBill, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaClipboardList, FaArrowLeft, FaUserCircle, FaChevronDown, FaFileExport } from "react-icons/fa";
import { PaymentContext } from "../../context/payment/PaymentContext";
import { MotionContext } from "../../context/motion/MotionContext";
import { SharesContext } from "../../context/share/ShareContext";
import { LoginContext } from "../../context/login/LoginContext";
import { StudentsContext } from "../../context/student/StudentContext";
import AppNavbar from "../navbar/AppNavbar";
import logo from "../../assets/logo.png";
import * as XLSX from "xlsx-js-style";
import "./economicMovements.css";

const EconomicMovements = () => {
    const { payments, fetchAllPayments, loading: loadingPayments } = useContext(PaymentContext);
    const { motions, fetchMotions, loading: loadingMotions } = useContext(MotionContext);
    const { cuotas, obtenerCuotasPorFecha, setCuotas, loading: loadingCuotas } = useContext(SharesContext);
    const { auth, userData } = useContext(LoginContext);
    const { estudiantes } = useContext(StudentsContext);
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [data, setData] = useState([]);
    const [isMounted, setIsMounted] = useState(false);

    const menuItems = [
        { name: "Inicio", route: "/", icon: <FaHome />, category: "principal" },
        { name: "Alumnos", route: "/student", icon: <FaUsers />, category: "principal" },
        { name: "Cuotas", route: "/share", icon: <FaMoneyBill />, category: "finanzas" },
        { name: "Reportes", route: "/report", icon: <FaChartBar />, category: "informes" },
        { name: "Movimientos", route: "/motion", icon: <FaExchangeAlt />, category: "finanzas" },
        { name: "Asistencia", route: "/attendance", icon: <FaCalendarCheck />, category: "principal" },
        { name: "Usuarios", route: "/user", icon: <FaUserCog />, category: "configuracion" },
        { name: "Ajustes", route: "/settings", icon: <FaCog />, category: "configuracion" },
        { name: "Envios de Mail", route: "/email-notifications", icon: <FaEnvelope />, category: "comunicacion" },
        { name: "Listado de Alumnos", route: "/liststudent", icon: <FaClipboardList />, category: "informes" },
        { name: 'Lista de Movimientos', route: '/listeconomic', icon: <FaList />, category: 'finanzas' }
    ];

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

    useEffect(() => {
        if (auth === "admin" && !isMounted) {
            setIsMounted(true);
            fetchAllPayments();
            fetchMotions();
            setCuotas([]);
            obtenerCuotasPorFecha(selectedDate).then((newCuotas) => {
            });
        }
    }, [auth, fetchAllPayments, fetchMotions, obtenerCuotasPorFecha, selectedDate, setCuotas, isMounted]);

    useEffect(() => {
        const combineData = () => {
            const seen = new Set();
            const allMovements = [
                ...payments.map(p => {
                    const student = estudiantes.find(s => s._id === p.studentId);
                    return {
                        ...p,
                        type: "Pago",
                        name: student ? `${student.name || ""} ${student.lastName || ""}`.trim() || "-" : "-",
                        concept: p.concept || "-",
                        paymentMethod: p.paymentMethod || p.paymentmethod || "-"
                    };
                }),
                ...motions.map(m => ({
                    ...m,
                    type: m.incomeType === "ingreso" ? "Ingreso" : "Egreso",
                    name: "-",
                    concept: m.concept || m.conceptName || "-",
                    paymentMethod: m.paymentMethod || "-"
                })),
                ...cuotas.map(c => {
                    const id = c._id;
                    if (seen.has(id)) return null;
                    seen.add(id);
                    return {
                        ...c,
                        type: "Cuota",
                        name: c.student?._id ? `${c.student.name || ""} ${c.student.lastName || ""}`.trim() || "-" : "-",
                        concept: "-",
                        paymentMethod: c.paymentmethod || "-",
                        paymentDate: c.paymentdate
                    };
                }).filter(c => c !== null),
            ].filter(m => {
                if (!m.paymentDate && !m.date) return false;
                const movementDate = new Date(m.paymentDate || m.date);
                const adjustedDate = new Date(movementDate.getTime());
                return adjustedDate.toISOString().split("T")[0] === selectedDate;
            });
            setData(allMovements);
        };
        combineData();
    }, [payments, motions, cuotas, selectedDate, estudiantes]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };
const handleExportExcel = () => {
  // Calcular totales
  const totalAmount = data.reduce((sum, m) => sum + (m.amount || 0), 0);
  const cashAmount = data.reduce(
    (sum, m) => (m.paymentMethod.toLowerCase() === "efectivo" ? sum + (m.amount || 0) : sum),
    0
  );
  const transferAmount = data.reduce(
    (sum, m) => (m.paymentMethod.toLowerCase() === "transferencia" ? sum + (m.amount || 0) : sum),
    0
  );

  // Preparar datos para el Excel
  const exportData = [
    ...data.map((m) => ({
      Fecha: new Date(new Date(m.paymentDate || m.date).getTime() + 3 * 60 * 60 * 1000).toLocaleDateString(
        "es-ES",
        {
          timeZone: "America/Argentina/Buenos_Aires",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      ),
      Concepto: capitalizeFirstLetter(m.concept || "-"),
      Monto: m.amount, // Usar número para formato de moneda
      Método: capitalizeFirstLetter(m.paymentMethod || "-"),
      Tipo: capitalizeFirstLetter(m.type || "-"),
      Nombre: capitalizeFirstLetter(m.name || "-"),
    })),
    {
      Fecha: "Total",
      Concepto: "",
      Monto: totalAmount,
      Método: `Efectivo: $${cashAmount.toLocaleString("es-ES")} - Transferencia: $${transferAmount.toLocaleString(
        "es-ES"
      )}`,
      Tipo: "", // Dejamos vacío, ya que se combinará con Método
      Nombre: "",
    },
  ];

  // Crear hoja de cálculo
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Definir estilos
  const headerStyle = {
    font: {
      name: "Arial",
      sz: 14,
      bold: true,
      color: { rgb: "FFFFFF" }, // Texto blanco
    },
    fill: {
      fgColor: { rgb: "e31fa8" }, // Fondo gris oscuro
      patternType: "solid",
    },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    alignment: {
      horizontal: "center",
      vertical: "center",
      wrapText: true,
    },
  };

  const cellStyle = {
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    font: {
      name: "Arial",
      sz: 12,
    },
    alignment: {
      horizontal: "left",
      vertical: "center",
      wrapText: true,
    },
  };

  const totalRowStyle = {
    font: {
      name: "Arial",
      sz: 12,
      bold: true,
    },
    fill: {
      fgColor: { rgb: "D3D3D3" }, // Fondo gris claro
      patternType: "solid",
    },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
    alignment: {
      horizontal: "left",
      vertical: "center",
      wrapText: true,
    },
  };

  // Aplicar estilos a los encabezados
  const headers = ["Fecha", "Concepto", "Monto", "Método", "Tipo", "Nombre"];
  headers.forEach((header, index) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
    ws[cellRef].s = headerStyle;
  });

  // Aplicar estilos a las celdas de datos y formato de moneda a "Monto"
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let row = 1; row <= range.e.r; row++) {
    for (let col = 0; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellRef]) continue; // Saltar celdas vacías
      ws[cellRef].s = row === range.e.r ? totalRowStyle : cellStyle; // Estilo diferente para la fila total
      if (col === 2) {
        // Columna "Monto" (índice 2)
        ws[cellRef].z = "$#,##0"; // Formato de moneda
      }
    }
  }

  // Combinar celdas de "Método" y "Tipo" en la fila de total
  const lastRow = range.e.r; // Última fila (fila de total)
  ws["!merges"] = [
    {
      s: { r: lastRow, c: 3 }, // Inicio: celda de "Método" (columna 3)
      e: { r: lastRow, c: 4 }, // Fin: celda de "Tipo" (columna 4)
    },
  ];

  // Ajustar ancho de columnas
  ws["!cols"] = [
    { wch: 12 }, // Fecha
    { wch: 20 }, // Concepto
    { wch: 15 }, // Monto
    { wch: 25 }, // Método
    { wch: 22 }, // Tipo
    { wch: 20 }, // Nombre
  ];

  // Crear libro y guardar archivo
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
  XLSX.writeFile(wb, `Movimientos_${selectedDate}.xlsx`);
};

    const handleLogout = () => {
        navigate("/login");
        setIsMenuOpen(false);
    };

    const capitalizeFirstLetter = (string) => {
        if (!string || string === "-") return string;
        return string
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

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
                                <li key={index} className="sidebar-menu-item" onClick={() => item.action ? item.action() : navigate(item.route)}>
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
                    <div className="filter-section-economic">
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={handleDateChange} 
                            max={new Date().toISOString().split("T")[0]} 
                            disabled={isLoading} // Deshabilitar durante carga
                        />
                        <button 
                            className="export-btn" 
                            onClick={handleExportExcel} 
                            disabled={isLoading || data.length === 0} // Deshabilitar durante carga o sin datos
                        >
                            <FaFileExport /> Exportar a Excel
                        </button>
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
                                {data.length > 0 ? (
                                    <>
                                        {data.map((item, index) => (
                                            <tr key={index}>
                                                <td>{new Date(new Date(item.paymentDate || item.date).getTime() + (3 * 60 * 60 * 1000)).toLocaleDateString("es-ES", {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}</td>
                                                <td>{capitalizeFirstLetter(item.concept || "-")}</td>
                                                <td>${item.amount.toLocaleString("es-ES")}</td>
                                                <td>{capitalizeFirstLetter(item.paymentMethod || "-")}</td>
                                                <td>{capitalizeFirstLetter(item.type || "-")}</td>
                                                <td>{capitalizeFirstLetter(item.name || "-")}</td>
                                            </tr>
                                        ))}
                                        <tr className="summary-row">
                                            <td>Total</td>
                                            <td></td>
                                            <td>${data.reduce((sum, m) => sum + (m.amount || 0), 0).toLocaleString("es-ES")}</td>
                                            <td>Efectivo: ${data.reduce((sum, m) =>
                                                (m.paymentMethod.toLowerCase() === "efectivo") ? sum + (m.amount || 0) : sum, 0).toLocaleString("es-ES")} - 
                                                Transferencia: ${data.reduce((sum, m) =>
                                                (m.paymentMethod.toLowerCase() === "transferencia") ? sum + (m.amount || 0) : sum, 0).toLocaleString("es-ES")}</td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr className="empty-table-row">
                                        <td colSpan="6" className="empty-table-message">
                                            {isLoading ? "Cargando movimientos..." : "No hay movimientos para el día seleccionado."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default EconomicMovements;