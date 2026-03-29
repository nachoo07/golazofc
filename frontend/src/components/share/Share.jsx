import { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSearch, FaClipboardList, FaMoneyBill, FaUserCircle, FaTimes as FaTimesClear } from "react-icons/fa";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import "./share.css";
import AppNavbar from "../navbar/AppNavbar";
import logo from '../../assets/logo.png';
import DesktopNavbar from "../navbar/DesktopNavbar";
import Sidebar from "../sidebar/Sidebar";
import Pagination from "../pagination/Pagination";

const FILTER_OPTIONS = ["todos", "pendiente", "pagado", "vencido", "sin cuotas"];
const STATUS_LABELS = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  vencido: "Vencido",
  "sin cuotas": "Sin cuotas",
};

const Share = () => {
  const { estudiantes, obtenerEstudiantes, loading: loadingStudents } = useContext(StudentsContext);
  const { cuotas, obtenerCuotas, loading: loadingCuotas } = useContext(SharesContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isInitialMount, setIsInitialMount] = useState(true);
  const loading = loadingStudents || loadingCuotas;
  const itemsPerPage = 10;

  const normalizeText = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

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
    // Leer query params
    const queryParams = new URLSearchParams(location.search);
    const page = parseInt(queryParams.get("page")) || 1;
    const search = queryParams.get("search") || "";
    const state = queryParams.get("state") || "todos";
    const normalizedState = FILTER_OPTIONS.includes(state) ? state : "todos";

    setCurrentPage(page);
    setSearchTerm(search);
    setStatusFilter(normalizedState);
  }, [location.search]);

  useEffect(() => {
    obtenerEstudiantes();
    obtenerCuotas();
    setIsInitialMount(false);
  }, [obtenerEstudiantes, obtenerCuotas]);

  const buildQueryString = useCallback(() => {
    const queryParams = new URLSearchParams();
    if (currentPage !== 1) queryParams.set("page", currentPage);
    if (searchTerm) queryParams.set("search", searchTerm);
    if (statusFilter !== "todos") queryParams.set("state", statusFilter);
    return queryParams.toString();
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (isInitialMount) return; // Evitar actualizar la URL durante el montaje inicial

    const queryString = buildQueryString();
    const newUrl = queryString ? `/share?${queryString}` : "/share";

    if (location.pathname + location.search !== newUrl) {
      navigate(newUrl, { replace: true });
    }
  }, [buildQueryString, navigate, location.pathname, location.search, isInitialMount]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const shareMetaByStudentId = useMemo(() => {
    const groupedByStudent = new Map();

    cuotas.forEach((cuota) => {
      const studentId = cuota.student?._id;
      if (!studentId) return;

      const normalizedState = normalizeText(cuota.state);
      const existing = groupedByStudent.get(studentId) || {
        hasVencido: false,
        hasPendiente: false,
        allPagado: true,
      };

      if (normalizedState === "vencido") existing.hasVencido = true;
      if (normalizedState === "pendiente") existing.hasPendiente = true;
      if (normalizedState !== "pagado") existing.allPagado = false;

      groupedByStudent.set(studentId, existing);
    });

    const metaMap = new Map();
    estudiantes.forEach((student) => {
      const studentMeta = groupedByStudent.get(student._id);
      if (!studentMeta) {
        metaMap.set(student._id, { status: "sin cuotas", statusLabel: STATUS_LABELS["sin cuotas"] });
        return;
      }

      let status = "sin cuotas";
      if (studentMeta.hasVencido) {
        status = "vencido";
      } else if (studentMeta.hasPendiente) {
        status = "pendiente";
      } else if (studentMeta.allPagado) {
        status = "pagado";
      }

      metaMap.set(student._id, {
        status,
        statusLabel: STATUS_LABELS[status] || STATUS_LABELS["sin cuotas"],
      });
    });

    return metaMap;
  }, [estudiantes, cuotas]);

  const shareCountByStatus = useMemo(() => {
    return estudiantes.reduce(
      (acc, student) => {
        const currentStatus = shareMetaByStudentId.get(student._id)?.status || "sin cuotas";
        if (acc[currentStatus] !== undefined) {
          acc[currentStatus] += 1;
        }
        acc.todos += 1;
        return acc;
      },
      { todos: 0, pendiente: 0, pagado: 0, vencido: 0, "sin cuotas": 0 }
    );
  }, [estudiantes, shareMetaByStudentId]);

  const filteredData = useMemo(() => {
    return estudiantes.filter((student) => {
      const searchNormalized = normalizeText(searchTerm);
      const nameNormalized = normalizeText(student.name);
      const lastNameNormalized = normalizeText(student.lastName);
      const fullName = `${nameNormalized} ${lastNameNormalized}`;
      const dniSearch = student.dni?.toString().toLowerCase().includes(searchNormalized);
      const matchesSearch = fullName.includes(searchNormalized) || dniSearch;
      const studentStatus = shareMetaByStudentId.get(student._id)?.status || "sin cuotas";
      const matchesStatus = statusFilter === "todos" || studentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [estudiantes, searchTerm, statusFilter, shareMetaByStudentId]);

  const handleViewCuotas = (studentId) => {
    const queryString = buildQueryString();
    navigate(`/share/${studentId}${queryString ? `?${queryString}` : ""}`);
  };

  const handleViewDetail = (studentId) => {
    const queryString = buildQueryString();
    navigate(`/detailstudent/${studentId}${queryString ? `?${queryString}` : ""}`);
  };

  const handleViewPayments = (studentId) => {
    const queryString = buildQueryString();
    navigate(`/paymentstudent/${studentId}${queryString ? `?${queryString}` : ""}`);
  };

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleFilterChange = (nextFilter) => {
    if (!FILTER_OPTIONS.includes(nextFilter)) {
      return;
    }
    if (nextFilter !== statusFilter) {
      setStatusFilter(nextFilter);
      setCurrentPage(1);
    }
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
          activeRoute="/share"
        />
        <main className="main-content">
          <section className="cuotas-header">
            <div className={`cuotas-search-container ${windowWidth <= 576 ? "mobile-search-container" : "desktop-search-container"}`}>
              <FaSearch className="mobile-search-icon" />
              <input
                type="text"
                placeholder="Buscar por nombre, apellido o DNI..."
                className="mobile-search-input"
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={loading}
              />
              {searchTerm && (
                <button
                  className="mobile-search-clear"
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                >
                  <FaTimesClear />
                </button>
              )}
            </div>
          </section>
          <section className="cuotas-filter">
            <div className="filter-actions-share">
              <div className="checkbox-filters-share" role="tablist" aria-label="Filtro de estado de cuotas">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`filter-pill ${statusFilter === option ? "active" : ""}`}
                    onClick={() => handleFilterChange(option)}
                    aria-pressed={statusFilter === option}
                    disabled={loading}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                    <span className="filter-count">{shareCountByStatus[option] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
          <section className="cuotas-table-section">
            <div className="table-wrapper">
              <table className="cuotas-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Dni</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((student, index) => {
                      const cuotaStatus = shareMetaByStudentId.get(student._id)?.statusLabel || "Sin cuotas";

                      return (
                        <tr key={student._id}>
                          <td>{indexOfFirstItem + index + 1}</td>
                          <td>{student.name}</td>
                          <td className="student-name">{student.lastName}</td>
                          <td>{student.dni}</td>
                          <td>{cuotaStatus}</td>
                          <td className="action-buttons-share">
                            <button
                              className="action-btn-student"
                              onClick={() => handleViewCuotas(student._id)}
                              title="Ver Cuotas"
                              disabled={loading}
                            >
                              <FaClipboardList />
                            </button>
                            <button
                              className="action-btn-student"
                              onClick={() => handleViewDetail(student._id)}
                              title="Ver Detalle Alumno"
                              disabled={loading}
                            >
                              <FaUserCircle />
                            </button>
                            <button
                              className="action-btn-student"
                              onClick={() => handleViewPayments(student._id)}
                              title="Ver Pagos"
                              disabled={loading}
                            >
                              <FaMoneyBill />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table-message">
                        {searchTerm
                          ? `No hay cuotas que coincidan con "${searchTerm}"`
                          : statusFilter !== "todos"
                            ? `No hay cuotas con estado "${statusFilter === "sin cuotas" ? "Sin cuotas" : statusFilter}"`
                            : "No hay cuotas registradas en el sistema"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={paginate}
              disabled={loading}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default Share;
