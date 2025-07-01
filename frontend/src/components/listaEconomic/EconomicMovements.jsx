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
        const loadData = async () => {
            if (auth === "admin" && !isMounted) {
                setIsMounted(true);
                try {
                    await Promise.all([
                        fetchAllPayments(),
                        fetchMotions(),
                        obtenerCuotasPorFecha(selectedDate).then((newCuotas) => {
                            console.log("Cuotas cargadas:", newCuotas); // Depuración
                            setCuotas(newCuotas);
                        })
                    ]);
                } catch (error) {
                    console.error("Error cargando datos:", error);
                }
            }
        };
        loadData();
    }, [auth, fetchAllPayments, fetchMotions, obtenerCuotasPorFecha, selectedDate, setCuotas, isMounted]);

    useEffect(() => {
        const fetchCuotasForDate = async () => {
            if (auth === "admin") {
                try {
                    const newCuotas = await obtenerCuotasPorFecha(selectedDate);
                    console.log("Cuotas actualizadas para fecha:", selectedDate, newCuotas); // Depuración
                    setCuotas(newCuotas);
                } catch (error) {
                    console.error("Error actualizando cuotas por fecha:", error);
                }
            }
        };
        fetchCuotasForDate();
    }, [auth, obtenerCuotasPorFecha, selectedDate, setCuotas]);

    useEffect(() => {
        const combineData = () => {
            if (!payments || !motions || !cuotas || !estudiantes) {
                setData([]);
                return;
            }
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
                    const paymentDate = c.paymentdate || c.date; // Usar paymentdate o date como fallback
                    return {
                        ...c,
                        type: "Cuota",
                        name: c.student?._id ? `${c.student.name || ""} ${c.student.lastName || ""}`.trim() || "-" : "-",
                        concept: "-",
                        paymentMethod: c.paymentmethod || "-",
                        paymentDate: paymentDate // Asegurar que paymentDate esté definido
                    };
                }).filter(c => c !== null),
            ].filter(m => {
                if (!m.paymentDate && !m.date) {
                    console.log("Movimiento sin fecha:", m); // Depuración
                    return false;
                }
                const movementDate = new Date(m.paymentDate || m.date);
                const adjustedDate = new Date(movementDate.getTime() + 3 * 60 * 60 * 1000); // Ajuste UTC-3
                const movementDateStr = adjustedDate.toISOString().split("T")[0];
                console.log(`Comparando ${movementDateStr} con ${selectedDate}`); // Depuración
                return movementDateStr === selectedDate;
            });
            setData(allMovements);
        };
        combineData();
    }, [payments, motions, cuotas, selectedDate, estudiantes]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleExportExcel = () => {
        const totalAmount = data.reduce((sum, m) => sum + (m.amount || 0), 0);
        const cashAmount = data.reduce(
            (sum, m) => (m.paymentMethod.toLowerCase() === "efectivo" ? sum + (m.amount || 0) : sum),
            0
        );
        const transferAmount = data.reduce(
            (sum, m) => (m.paymentMethod.toLowerCase() === "transferencia" ? sum + (m.amount || 0) : sum),
            0
        );

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
                Monto: m.amount,
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
                    if (col === 2) ws[cellRef].z = "$#,##0";
                }
            }
        }

        ws["!merges"] = [{ s: { r: range.e.r, c: 3 }, e: { r: range.e.r, c: 4 } }];
        ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 20 }];

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
                            disabled={isLoading} 
                        />
                        <button 
                            className="export-btn" 
                            onClick={handleExportExcel} 
                            disabled={isLoading || data.length === 0} 
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