import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBars, FaTimes, FaUsers, FaMoneyBill, FaChartBar, FaExchangeAlt, FaCalendarCheck, FaUserCog, FaCog, FaEnvelope, FaHome, FaClipboardList, FaUserCircle, FaChevronDown, FaSpinner } from 'react-icons/fa';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import GraphicMonthly from '../graphic/GraphicMonthly';
import CalendarReport from '../calendar/CalendarReport';
import { StudentsContext } from '../../context/student/StudentContext';
import { SharesContext } from '../../context/share/ShareContext';
import { MotionContext } from '../../context/motion/MotionContext';
import { LoginContext } from '../../context/login/LoginContext';
import { PaymentContext } from '../../context/payment/PaymentContext';
import './report.css';
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';

dayjs.locale('es');

const Report = () => {
  const { countStudentsByState } = useContext(StudentsContext);
  const { obtenerCuotasPorFecha, obtenerCuotasPorFechaRange, cuotasStatusCount, loading: loadingCuotas, obtenerCuotasStatusCount, isInitialLoadComplete } = useContext(SharesContext);
  const { getMotionsByDate, getMotionsByDateRange, loading: loadingMotions } = useContext(MotionContext);
  const { auth, logout, userData } = useContext(LoginContext);
  const { payments, fetchAllPayments, loading: loadingPayments } = useContext(PaymentContext);
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 768);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const hasFetched = useRef({ initial: false, payments: false });

  const menuItems = [
    { name: 'Inicio', route: '/', icon: <FaHome />, category: 'principal' },
    { name: 'Alumnos', route: '/student', icon: <FaUsers />, category: 'principal' },
    { name: 'Cuotas', route: '/share', icon: <FaMoneyBill />, category: 'finanzas' },
    { name: 'Reportes', route: '/report', icon: <FaChartBar />, category: 'informes' },
    { name: 'Movimientos', route: '/motion', icon: <FaExchangeAlt />, category: 'finanzas' },
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck />, category: 'principal' },
    { name: 'Usuarios', route: '/user', icon: <FaUserCog />, category: 'configuracion' },
    { name: 'Ajustes', route: '/settings', icon: <FaCog />, category: 'configuracion' },
    { name: 'Envios de Mail', route: '/email-notifications', icon: <FaEnvelope />, category: 'comunicacion' },
    { name: 'Listado de Alumnos', route: '/liststudent', icon: <FaClipboardList />, category: 'informes' },
  ];

  const activos = countStudentsByState('Activo') || 0;
  const inactivos = countStudentsByState('Inactivo') || 0;

  const [selectedDateCuotas, setSelectedDateCuotas] = useState(dayjs().startOf('day'));
  const [selectedDateIngresos, setSelectedDateIngresos] = useState(dayjs().startOf('day'));
  const [selectedDateEgresos, setSelectedDateEgresos] = useState(dayjs().startOf('day'));
  const [selectedDatePagos, setSelectedDatePagos] = useState(dayjs().startOf('day'));
  const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'));

  const [data, setData] = useState({
    cuotas: { efectivo: 0, transferencia: 0, error: null },
    ingresos: { efectivo: 0, transferencia: 0, error: null },
    egresos: { efectivo: 0, transferencia: 0, error: null },
    pagos: { efectivo: 0, transferencia: 0, error: null },
    monthlyData: {
      totalCuotas: 0,
      totalIngresos: 0,
      totalEgresos: 0,
      balanceFinal: 0,
      efectivoDisponible: 0,
      transferenciaDisponible: 0,
      error: null,
    },
  });

  // Fetch para cuotas
  const fetchCuotas = useCallback(async (date) => {
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const cuotasData = await obtenerCuotasPorFecha(dateStr);
      const cuotasArray = Array.isArray(cuotasData) ? cuotasData : [];
      const efectivo = cuotasArray
        .filter((c) => (c.paymentmethod || '').toLowerCase() === 'efectivo')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      const transferencia = cuotasArray
        .filter((c) => (c.paymentmethod || '').toLowerCase() === 'transferencia')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      setData((prev) => ({ ...prev, cuotas: { efectivo, transferencia, error: null } }));
    } catch (error) {
      console.error('Error en fetchCuotas:', error);
      setData((prev) => ({ ...prev, cuotas: { efectivo: 0, transferencia: 0, error: 'Error al cargar cuotas' } }));
    }
  }, [obtenerCuotasPorFecha]);

  // Fetch para ingresos
  const fetchIngresos = useCallback(async (date) => {
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const motionsData = await getMotionsByDate(dateStr);
      const motionsArray = Array.isArray(motionsData) ? motionsData : [];
      const efectivo = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'efectivo' && m.incomeType === 'ingreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const transferencia = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'transferencia' && m.incomeType === 'ingreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      setData((prev) => ({ ...prev, ingresos: { efectivo, transferencia, error: null } }));
    } catch (error) {
      console.error('Error en fetchIngresos:', error);
      setData((prev) => ({ ...prev, ingresos: { efectivo: 0, transferencia: 0, error: 'Error al cargar ingresos' } }));
    }
  }, [getMotionsByDate]);

  // Fetch para egresos
  const fetchEgresos = useCallback(async (date) => {
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const motionsData = await getMotionsByDate(dateStr);
      const motionsArray = Array.isArray(motionsData) ? motionsData : [];
      const efectivo = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'efectivo' && m.incomeType === 'egreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const transferencia = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'transferencia' && m.incomeType === 'egreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      setData((prev) => ({ ...prev, egresos: { efectivo, transferencia, error: null } }));
    } catch (error) {
      console.error('Error en fetchEgresos:', error);
      setData((prev) => ({ ...prev, egresos: { efectivo: 0, transferencia: 0, error: 'Error al cargar egresos' } }));
    }
  }, [getMotionsByDate]);

  // Fetch para pagos
  const fetchPagos = useCallback(async (date) => {
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const paymentsArray = Array.isArray(payments) ? payments : [];
      const filteredPayments = paymentsArray.filter((p) => {
        const paymentDate = new Date(p.paymentDate || p.date);
        return paymentDate.toISOString().split('T')[0] === dateStr;
      });
      const efectivo = filteredPayments
        .filter((p) => (p.paymentMethod || p.paymentmethod || '').toLowerCase() === 'efectivo')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const transferencia = filteredPayments
        .filter((p) => (p.paymentMethod || p.paymentmethod || '').toLowerCase() === 'transferencia')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      setData((prev) => ({ ...prev, pagos: { efectivo, transferencia, error: null } }));
    } catch (error) {
      console.error('Error en fetchPagos:', error);
      setData((prev) => ({ ...prev, pagos: { efectivo: 0, transferencia: 0, error: 'Error al cargar pagos' } }));
    }
  }, [payments]);

  // Fetch para reporte mensual
  const fetchMonthlyData = useCallback(async (month) => {
    try {
      const startOfMonth = month.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = month.endOf('month').format('YYYY-MM-DD');
      const [cuotas, motions] = await Promise.all([
        obtenerCuotasPorFechaRange(startOfMonth, endOfMonth),
        getMotionsByDateRange(startOfMonth, endOfMonth),
      ]);

      const cuotasArray = Array.isArray(cuotas) ? cuotas : [];
      const motionsArray = Array.isArray(motions) ? motions : [];
      const paymentsArray = Array.isArray(payments) ? payments : [];
      const filteredPayments = paymentsArray.filter((p) => {
        const paymentDate = new Date(p.paymentDate || p.date);
        return paymentDate >= new Date(startOfMonth) && paymentDate <= new Date(endOfMonth);
      });

      const totalCuotas = cuotasArray.reduce((sum, cuota) => sum + (cuota.amount || 0), 0);
      const totalIngresos = motionsArray
        .filter((m) => m.incomeType === 'ingreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const totalEgresos = motionsArray
        .filter((m) => m.incomeType === 'egreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const efectivoCuotas = cuotasArray
        .filter((c) => (c.paymentmethod || '').toLowerCase() === 'efectivo')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      const transferenciaCuotas = cuotasArray
        .filter((c) => (c.paymentmethod || '').toLowerCase() === 'transferencia')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      const efectivoIngresos = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'efectivo' && m.incomeType === 'ingreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const transferenciaIngresos = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'transferencia' && m.incomeType === 'ingreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const efectivoEgresos = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'efectivo' && m.incomeType === 'egreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const transferenciaEgresos = motionsArray
        .filter((m) => (m.paymentMethod || '').toLowerCase() === 'transferencia' && m.incomeType === 'egreso')
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      const efectivoPagos = filteredPayments
        .filter((p) => (p.paymentMethod || p.paymentmethod || '').toLowerCase() === 'efectivo')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const transferenciaPagos = filteredPayments
        .filter((p) => (p.paymentMethod || p.paymentmethod || '').toLowerCase() === 'transferencia')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      setData((prev) => ({
        ...prev,
        monthlyData: {
          totalCuotas,
          totalIngresos,
          totalEgresos,
          balanceFinal: totalCuotas + totalIngresos - totalEgresos + efectivoPagos + transferenciaPagos,
          efectivoDisponible: efectivoCuotas + efectivoIngresos - efectivoEgresos + efectivoPagos,
          transferenciaDisponible: transferenciaCuotas + transferenciaIngresos - transferenciaEgresos + transferenciaPagos,
          error: null,
        },
      }));
    } catch (error) {
      console.error('Error en fetchMonthlyData:', error);
      setData((prev) => ({
        ...prev,
        monthlyData: {
          totalCuotas: 0,
          totalIngresos: 0,
          totalEgresos: 0,
          balanceFinal: 0,
          efectivoDisponible: 0,
          transferenciaDisponible: 0,
          error: 'Error al cargar reporte mensual',
        },
      }));
    }
  }, [obtenerCuotasPorFechaRange, getMotionsByDateRange, payments]);

  // Carga inicial
  useEffect(() => {
    if (hasFetched.current.initial || auth !== 'admin') return;
    hasFetched.current.initial = true;

    const fetchInitialData = async () => {
      try {
        await Promise.all([
          obtenerCuotasStatusCount(),
          fetchAllPayments().then(() => {
            hasFetched.current.payments = true;
          }),
          fetchCuotas(dayjs().startOf('day')),
          fetchIngresos(dayjs().startOf('day')),
          fetchEgresos(dayjs().startOf('day')),
          fetchPagos(dayjs().startOf('day')),
          fetchMonthlyData(dayjs().startOf('month')),
        ]);
      } catch (error) {
        console.error('Error en carga inicial:', error);
      }
    };
    fetchInitialData();
  }, [auth, obtenerCuotasStatusCount, fetchAllPayments, fetchCuotas, fetchIngresos, fetchEgresos, fetchPagos, fetchMonthlyData]);

  // Manejo de resize
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      setIsMenuOpen(newWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounce para DatePicker
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const handleDateChangeCuotas = debounce((newValue) => {
    setSelectedDateCuotas(newValue);
    fetchCuotas(newValue);
  }, 500);

  const handleDateChangeIngresos = debounce((newValue) => {
    setSelectedDateIngresos(newValue);
    fetchIngresos(newValue);
  }, 500);

  const handleDateChangeEgresos = debounce((newValue) => {
    setSelectedDateEgresos(newValue);
    fetchEgresos(newValue);
  }, 500);

  const handleDateChangePagos = debounce((newValue) => {
    setSelectedDatePagos(newValue);
    fetchPagos(newValue);
  }, 500);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsMenuOpen(false);
  };


  return (
    <div className="app-container">
      {windowWidth <= 576 && (
        <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      )}
      {windowWidth > 576 && (
        <header className="desktop-nav-header">
          <div className="header-logo-setting" onClick={() => navigate('/')}>
            <img src={logo} alt="Valladares Fútbol" className="logo-image" />
          </div>
          <div className="nav-right-section">
            <div className="profile-container" onClick={() => setIsProfileOpen(!isProfileOpen)}>
              <FaUserCircle className="profile-icon" />
              <span className="profile-greeting">Hola, {userData?.name || 'Usuario'}</span>
              <FaChevronDown className={`arrow-icon ${isProfileOpen ? 'rotated' : ''}`} />
              {isProfileOpen && (
                <div className="profile-menu">
                  <div className="menu-option" onClick={() => { navigate('/user'); setIsProfileOpen(false); }}>
                    <FaUserCog className="option-icon" /> Mi Perfil
                  </div>
                  <div className="menu-option" onClick={() => { navigate('/settings'); setIsProfileOpen(false); }}>
                    <FaCog className="option-icon" /> Configuración
                  </div>
                  <div className="menu-separator" />
                  <div className="menu-option logout-option" onClick={() => { handleLogout(); setIsProfileOpen(false); }}>
                    <FaUserCircle className="option-icon" /> Cerrar Sesión
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <div className="dashboard-container">
        <aside className={`sidebar ${isMenuOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
            <ul className="sidebar-menu">
              {menuItems.map((item, index) => (
                <li
                  key={index}
                  className={`sidebar-menu-item ${item.route === '/report' ? 'active' : ''}`}
                  onClick={() => navigate(item.route)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-text">{item.name}</span>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="content-container">
          <div className="welcome-text">
            <h1>Panel de Reporte</h1>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <h3 className="titulo-card color-card">Alumnos Activos</h3>
              <p className="stat-value">{activos}</p>
            </div>
            <div className="stat-card">
              <h3 className="titulo-card color-card">Alumnos Inactivos</h3>
              <p className="stat-value">{inactivos}</p>
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
          <div className="charts-grid">
            <div className="chart-card1">
              <div className="chart-card">
                <div className="header-cuotas">
                  <h3 className="titulo-cuota">Cuotas</h3>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      value={selectedDateCuotas}
                      maxDate={dayjs()}
                      onChange={handleDateChangeCuotas}
                      className="custom-datepicker"
                    />
                  </LocalizationProvider>
                </div>
                {data.cuotas.error ? (
                  <p className="error-message">{data.cuotas.error}</p>
                ) : (
                  <div className="chart-stats">
                    <div className="stat-item">
                      <span className="stat-label">Efectivo:</span>
                      <span className="stat-value">${data.cuotas.efectivo.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Transferencia:</span>
                      <span className="stat-value">${data.cuotas.transferencia.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">${(data.cuotas.efectivo + data.cuotas.transferencia).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chart-card">
                <div className="header-cuotas">
                  <h3 className="titulo-cuota">Pagos de Alumnos</h3>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      value={selectedDatePagos}
                      maxDate={dayjs()}
                      onChange={handleDateChangePagos}
                      className="custom-datepicker"
                    />
                  </LocalizationProvider>
                </div>
                {data.pagos.error ? (
                  <p className="error-message">{data.pagos.error}</p>
                ) : (
                  <div className="chart-stats">
                    <div className="stat-item">
                      <span className="stat-label">Efectivo:</span>
                      <span className="stat-value">${data.pagos.efectivo.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Transferencia:</span>
                      <span className="stat-value">${data.pagos.transferencia.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">${(data.pagos.efectivo + data.pagos.transferencia).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="chart-card1">
              <div className="chart-card">
                <div className="header-cuotas">
                  <h3 className="titulo-cuota">Ingresos</h3>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      value={selectedDateIngresos}
                      maxDate={dayjs()}
                      onChange={handleDateChangeIngresos}
                      className="custom-datepicker"
                    />
                  </LocalizationProvider>
                </div>
                {data.ingresos.error ? (
                  <p className="error-message">{data.ingresos.error}</p>
                ) : (
                  <div className="chart-stats">
                    <div className="stat-item">
                      <span className="stat-label">Efectivo:</span>
                      <span className="stat-value">${data.ingresos.efectivo.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Transferencia:</span>
                      <span className="stat-value">${data.ingresos.transferencia.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">${(data.ingresos.efectivo + data.ingresos.transferencia).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chart-card">
                <div className="header-cuotas">
                  <h3 className="titulo-cuota">Egresos</h3>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      value={selectedDateEgresos}
                      maxDate={dayjs()}
                      onChange={handleDateChangeEgresos}
                      className="custom-datepicker"
                    />
                  </LocalizationProvider>
                </div>
                {data.egresos.error ? (
                  <p className="error-message">{data.egresos.error}</p>
                ) : (
                  <div className="chart-stats">
                    <div className="stat-item">
                      <span className="stat-label">Efectivo:</span>
                      <span className="stat-value">${data.egresos.efectivo.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Transferencia:</span>
                      <span className="stat-value">${data.egresos.transferencia.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total:</span>
                      <span className="stat-value">${(data.egresos.efectivo + data.egresos.transferencia).toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="chart-card full-width">
              <div className="header-mensual">
                <h3 className="titulo-mensual">Reporte Mensual</h3>
                <div className="calendar-container">
                  <CalendarReport
                    onMonthChange={(newMonth) => {
                      const month = dayjs(newMonth).startOf('month');
                      setSelectedMonth(month);
                      fetchMonthlyData(month);
                    }}
                    selectedMonth={selectedMonth}
                  />
                </div>
              </div>
              {data.monthlyData.error ? (
                <p className="error-message">{data.monthlyData.error}</p>
              ) : (
                <GraphicMonthly data={data.monthlyData} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;