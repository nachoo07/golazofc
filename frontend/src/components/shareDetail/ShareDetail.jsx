import { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaTimes, FaArrowLeft, FaEdit, FaTrash, FaMoneyBillWave, FaPlus, FaSearch, FaSpinner } from "react-icons/fa";
import { FiUser, FiCreditCard, FiEdit3, FiTrash2 } from "react-icons/fi";
import { StudentsContext } from "../../context/student/StudentContext";
import { SharesContext } from "../../context/share/ShareContext";
import { PaymentContext } from "../../context/payment/PaymentContext";
import SendVoucherEmail from "../voucherEmail/SendVoucherEmail";
import SendPaymentVoucherEmail from "../voucherPayment/SendPaymentVoucerEmail";
import ShareFormModal from "../modalShare/ShareFormModal";
import AppNavbar from "../navbar/AppNavbar";
import { showConfirmAlert, showErrorAlert, showSuccessToast } from "../../utils/alerts/Alerts";
import "./shareDetail.css";
import logo from '../../assets/logo.png';
import DesktopNavbar from "../navbar/DesktopNavbar";
import Sidebar from "../sidebar/Sidebar";
import PaymentStudent from "../paymentStudent/PaymentStudent";
import { getFirstValidationMessage, isValidationErrorResponse, mapValidationErrors } from "../../utils/forms/validationErrors";

const MONTHS = [
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

const extractShareYearMonth = (value) => {
  if (!value) return { year: "", monthIndex: -1 };
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return {
        year: match[1],
        monthIndex: Number(match[2]) - 1,
      };
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { year: "", monthIndex: -1 };
  }

  return {
    year: String(parsed.getUTCFullYear()),
    monthIndex: parsed.getUTCMonth(),
  };
};

const ShareDetail = () => {
  const { selectedStudent, obtenerEstudiantePorId, loading: loadingStudent } = useContext(StudentsContext);
  const { cuotas, obtenerCuotasPorEstudiante, addCuota, updateCuota, deleteCuota, loading: loadingCuotas } = useContext(SharesContext);
  const {
    payments,
    concepts,
    loadingPayments,
    loadingConcepts,
    createPayment,
    updatePaymentConcept,
    createConcept,
    deleteConcept,
  } = useContext(PaymentContext);
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCuota, setSelectedCuota] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState("cuotas");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [shareFormErrors, setShareFormErrors] = useState({});

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [newConcept, setNewConcept] = useState("");
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [paymentFormErrors, setPaymentFormErrors] = useState({});
  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    paymentDate: "",
    paymentMethod: "",
    concept: "",
    studentId,
  });

  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isSendingVoucher, setIsSendingVoucher] = useState(false);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const loading = loadingStudent || loadingCuotas;
  const paymentBusy = loading || loadingPayments || loadingConcepts;
  const toInputDate = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const isoPrefix = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (isoPrefix) return isoPrefix[1];
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const today = toInputDate(new Date());
  const isStudentInactive = selectedStudent?.state === "Inactivo";

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      setInitialFetchDone(false);
      try {
        await Promise.all([
          obtenerEstudiantePorId(studentId),
          obtenerCuotasPorEstudiante(studentId),
        ]);
      } catch (error) {
        console.error("ShareDetail: Error loading data:", {
          studentId,
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      } finally {
        setInitialFetchDone(true);
      }
    };

    loadData();
  }, [studentId, obtenerEstudiantePorId, obtenerCuotasPorEstudiante]);

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
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get("tab");
    if (tabParam === "pagos" || tabParam === "cuotas") {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (!isSendingVoucher) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSendingVoucher]);

  const availableCuotaYears = useMemo(() => {
    const yearsFromCuotas = cuotas
      .map((cuota) => extractShareYearMonth(cuota.date).year)
      .filter(Boolean);

    const currentYear = new Date().getFullYear();
    const fixedYears = ["2025", currentYear.toString(), (currentYear + 1).toString()];

    return [...new Set([...fixedYears, ...yearsFromCuotas])].sort();
  }, [cuotas]);

  const availablePaymentYears = useMemo(() => {
    const yearsFromPayments = payments
      .map((payment) => new Date(payment.paymentDate).getFullYear().toString())
      .filter((year) => year !== "NaN");

    const currentYear = new Date().getFullYear();
    const fixedYears = ["2025", currentYear.toString(), (currentYear + 1).toString()];

    return [...new Set([...fixedYears, ...yearsFromPayments])].sort();
  }, [payments]);

  const availableYears = activeTab === "pagos" ? availablePaymentYears : availableCuotaYears;

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0] || "2025");
    }
  }, [availableYears, selectedYear]);

  const filteredCuotas = useMemo(() => {
    if (!selectedStudent || !Array.isArray(cuotas)) {
      return [];
    }

    return cuotas
      .filter((cuota) => {
        const cuotaStudentId =
          typeof cuota.student === "object" && cuota.student !== null
            ? cuota.student._id
            : cuota.student;

        return (
          String(cuotaStudentId) === String(selectedStudent._id) &&
          extractShareYearMonth(cuota.date).year === selectedYear
        );
      })
      .sort((a, b) => extractShareYearMonth(a.date).monthIndex - extractShareYearMonth(b.date).monthIndex);
  }, [cuotas, selectedStudent, selectedYear]);

  const handleSave = async (cuotaData) => {
    try {
      setShareFormErrors({});
      if (isEditing) {
        await updateCuota(cuotaData);
        showSuccessToast("La cuota ha sido actualizada correctamente.");
      } else {
        await addCuota(cuotaData);
        showSuccessToast("La cuota ha sido creada correctamente.");
      }
      setSelectedCuota(null);
      setIsEditing(false);
      setShowModal(false);
    } catch (error) {
      if (isValidationErrorResponse(error)) {
        const errors = mapValidationErrors(error);
        if (Object.keys(errors).length > 0) {
          setShareFormErrors(errors);
        } else {
          setShareFormErrors({ general: getFirstValidationMessage(error) || "Error al guardar la cuota. Intenta de nuevo." });
        }
        return;
      }
      showErrorAlert("Error", error.response?.data?.message || error.message || "Error al guardar la cuota. Intenta de nuevo.");
      console.error("Error en handleSave:", error);
    }
  };

  const handleEditClick = (cuota) => {
    if (isStudentInactive) {
      return;
    }
    setSelectedCuota(cuota);
    setIsEditing(true);
    setShareFormErrors({});
    setShowModal(true);
  };

  const handleCreateClick = () => {
    if (isStudentInactive) {
      return;
    }
    setSelectedCuota(null);
    setIsEditing(false);
    setShareFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (isStudentInactive) {
      return;
    }
    if (!id) {
      showErrorAlert("Error", "ID de cuota inválido.");
      console.error("ID de cuota no proporcionado");
      return;
    }
    try {
      const confirmacion = await showConfirmAlert(
        "¿Estás seguro que deseas eliminar la cuota?",
        "Esta acción no se puede deshacer"
      );
      if (confirmacion) {
        await deleteCuota(id);
        showSuccessToast("La cuota ha sido eliminada correctamente.");
      }

    } catch (error) {
      showErrorAlert("Error", error.message || "Error al eliminar la cuota. Intenta de nuevo.");
    }
  };

  const handleStudentUpdate = () => {
    obtenerEstudiantePorId(studentId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}-${month}-${year}`;
  };

  const formatMonth = (dateString) => {
    const { monthIndex } = extractShareYearMonth(dateString);
    return monthIndex >= 0 ? MONTHS[monthIndex] : "-";
  };

  const usedMonths = filteredCuotas
    .map((cuota) => extractShareYearMonth(cuota.date).monthIndex + 1)
    .filter((month) => month > 0);
  const availableMonths = MONTHS.filter((_, index) => !usedMonths.includes(index + 1));

  const handleFilterChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      setSelectedYear(name);
    }
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount: "",
      paymentDate: today,
      paymentMethod: "",
      concept: "",
      studentId,
    });
    setPaymentFormErrors({});
    setEditMode(false);
    setEditPaymentId(null);
  };

  const handleOpenPaymentModal = () => {
    if (isStudentInactive) {
      return;
    }
    resetPaymentForm();
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    resetPaymentForm();
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentFormErrors((prev) => ({ ...prev, [name]: undefined }));
    setPaymentFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validatePaymentForm = () => {
    const nextErrors = {};
    if (!paymentFormData.concept) nextErrors.concept = "Debe seleccionar un concepto.";
    const amount = Number(paymentFormData.amount);
    if (!paymentFormData.amount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = "El monto debe ser mayor a 0.";
    }
    if (!paymentFormData.paymentDate) {
      nextErrors.paymentDate = "La fecha de pago es obligatoria.";
    } else if (paymentFormData.paymentDate > today) {
      nextErrors.paymentDate = "La fecha no puede ser futura.";
    }
    if (!paymentFormData.paymentMethod) nextErrors.paymentMethod = "Debe seleccionar un método de pago.";
    setPaymentFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isStudentInactive) {
      return;
    }
    if (!validatePaymentForm()) return;
    try {
      const paymentData = {
        ...paymentFormData,
        paymentDate: paymentFormData.paymentDate,
      };

      if (editMode) {
        await updatePaymentConcept(editPaymentId, paymentData);
      } else {
        await createPayment(paymentData);
      }

      setShowPaymentModal(false);
      resetPaymentForm();
      showSuccessToast(editMode ? "El pago fue actualizado correctamente." : "El pago fue registrado correctamente.");

    } catch (error) {
      if (isValidationErrorResponse(error)) {
        const errors = mapValidationErrors(error);
        if (Object.keys(errors).length > 0) {
          setPaymentFormErrors(errors);
        } else {
          setPaymentFormErrors({ general: getFirstValidationMessage(error) || "No se pudo guardar el pago." });
        }
        return;
      }
      showErrorAlert("Error", error.response?.data?.message || error.message || "No se pudo guardar el pago.");
    }
  };

  const handleOpenConceptModal = () => {
    if (isStudentInactive) {
      return;
    }
    setNewConcept("");
    setShowConceptModal(true);
  };

  const handleCloseConceptModal = () => {
    setShowConceptModal(false);
    setNewConcept("");
  };

  const handleAddConcept = async (e) => {
    e.preventDefault();
    if (isStudentInactive) {
      return;
    }
    try {
      const normalizedConcept = newConcept.trim();
      if (!normalizedConcept) {
        throw new Error("El concepto no puede estar vacío.");
      }

      await createConcept(normalizedConcept);
      setNewConcept("");
      showSuccessToast("Concepto creado correctamente.");

    } catch (error) {
      showErrorAlert("Error", error.response?.data?.message || error.message || "No se pudo crear el concepto.");
    }
  };

  const handleDeleteConcept = async (conceptId, conceptName) => {
    if (isStudentInactive) {
      return;
    }
    const isConfirmed = await showConfirmAlert(
      "¿Estás seguro?",
      `Eliminarás el concepto "${conceptName}". Esta acción no se puede deshacer.`
    );
    if (!isConfirmed) return;

    try {
      await deleteConcept(conceptId.toString());
      showSuccessToast("Concepto eliminado correctamente.");

    } catch (error) {
      showErrorAlert("Error", error.response?.data?.message || "No se pudo eliminar el concepto.");
    }
  };

  const handleBack = () => {
    navigate(`/share${location.search}`);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab !== "cuotas" && nextTab !== "pagos") {
      return;
    }

    setActiveTab(nextTab);
    const queryParams = new URLSearchParams(location.search);
    queryParams.set("tab", nextTab);
    navigate({ search: queryParams.toString() }, { replace: true });
  };

  if (!selectedStudent && initialFetchDone && !loading) {
    return (
      <div className="app-container error-container">
        <h2>Estudiante no encontrado</h2>
        <p>El estudiante con ID {studentId} no está disponible. Verifica los datos o vuelve a la lista.</p>
        <button className="btn-back" onClick={() => navigate("/student")}>Volver a la lista de estudiantes</button>
      </div>
    );
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
          activeRoute="/share"
        />
        <div className="main-content">
          {loading || !selectedStudent ? (
            <div className="loading-message">
              Cargando datos...
            </div>
          ) : (
            <>
              <section className="dashboard-welcome">
                <div className="welcome-text">
                  <h1 className="title-dashboard-share">
                    {activeTab === "pagos" ? "Pagos de" : "Cuotas de"} {selectedStudent.name} {selectedStudent.lastName}
                  </h1>
                </div>
              </section>
              {isStudentInactive && (
                <div className="closure-inline-notice" role="status" aria-live="polite">
                  <div>
                    <strong>Alumno inactivo.</strong> Solo se permite consulta. Crear, editar y eliminar cuotas/pagos está bloqueado.
                  </div>
                </div>
              )}
              <section className="detail-table-header">
                <div className="detail-tabs-row">
                  <div className="detail-tabs" role="tablist" aria-label="Vista de detalle">
                    <button
                      type="button"
                      className={`detail-tab ${activeTab === "cuotas" ? "active" : ""}`}
                      onClick={() => handleTabChange("cuotas")}
                      disabled={loading}
                      aria-selected={activeTab === "cuotas"}
                    >
                      Cuotas
                    </button>
                    <button
                      type="button"
                      className={`detail-tab ${activeTab === "pagos" ? "active" : ""}`}
                      onClick={() => handleTabChange("pagos")}
                      disabled={loading}
                      aria-selected={activeTab === "pagos"}
                    >
                      Pagos
                    </button>
                  </div>
                </div>
                <div className="detail-controls-row">
                  <div className="checkbox-filters">
                    {availableYears.map((year) => (
                      <label key={year} className="checkbox-label">
                        <input
                          type="checkbox"
                          name={year}
                          checked={selectedYear === year}
                          onChange={handleFilterChange}
                          disabled={loading}
                        />
                        <span className="checkbox-custom-share">{year}</span>
                      </label>
                    ))}
                  </div>
                  <div className="detail-actions-row">
                    {activeTab === "pagos" && (
                      <div className="payments-search-container inline-search">
                        <FaSearch className="payments-search-icon" />
                        <input
                          type="text"
                          placeholder="Buscar pagos por concepto o método..."
                          className="payments-search-input"
                          value={paymentSearchQuery}
                          onChange={(e) => setPaymentSearchQuery(e.target.value)}
                          disabled={loading}
                        />
                        {paymentSearchQuery && (
                          <button
                            type="button"
                            className="payments-search-clear"
                            onClick={() => setPaymentSearchQuery("")}
                            disabled={loading}
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    )}
                    {activeTab === "cuotas" ? (
                      <button className="add-btn-detail-share" onClick={handleCreateClick} disabled={loading || isStudentInactive}>
                        <FaPlus /> Crear Cuota
                      </button>
                    ) : (
                      <>
                        <button className="add-btn-detail-share" onClick={handleOpenPaymentModal} disabled={paymentBusy || isStudentInactive}>
                          <FaPlus /> Añadir Pago
                        </button>
                        <button className="add-btn-detail-share" onClick={handleOpenConceptModal} disabled={paymentBusy || isStudentInactive}>
                          <FaPlus /> Crear Concepto
                        </button>
                      </>
                    )}
                    <button className="back-btn-detail-share" onClick={handleBack} disabled={loading}>
                      Volver
                    </button>
                  </div>
                </div>
              </section>
              <section className="cuotas-table-section">
                <div className="table-wrapper">
                  {activeTab === "cuotas" ? (
                    <table className="cuotas-table">
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th>Monto</th>
                          <th>Método de Pago</th>
                          <th>Fecha de Pago</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCuotas.length > 0 ? (
                          filteredCuotas.map((cuota) => (
                            <tr key={cuota._id}>
                              <td>{formatMonth(cuota.date)}</td>
                              <td>
                                {new Intl.NumberFormat("es-AR", {
                                  style: "currency",
                                  currency: "ARS",
                                  minimumFractionDigits: 0,
                                }).format(cuota.amount)}
                              </td>
                              <td>{cuota.paymentmethod || "-"}</td>
                              <td>{cuota.paymentdate ? formatDate(cuota.paymentdate) : "-"}</td>
                              <td>{cuota.state}</td>
                              <td className="action-buttons">
                                <button
                                  className="action-btn-student"
                                  onClick={() => handleEditClick(cuota)}
                                  title={cuota.paymentmethod && cuota.paymentdate ? "Editar" : "Pagar"}
                                  aria-label={cuota.paymentmethod && cuota.paymentdate ? "Editar cuota" : "Pagar cuota"}
                                  disabled={loading || isSendingVoucher || isStudentInactive}
                                >
                                  {cuota.paymentmethod && cuota.paymentdate ? <FiEdit3 /> : <FaMoneyBillWave />}
                                </button>
                                <button
                                  className="action-btn-student"
                                  onClick={() => handleDelete(cuota._id)}
                                  title="Eliminar"
                                  aria-label="Eliminar cuota"
                                  disabled={loading || isSendingVoucher || isStudentInactive}
                                >
                                  <FaTrash />
                                </button>
                                <SendVoucherEmail
                                  student={selectedStudent}
                                  cuota={cuota}
                                  onSendingStart={() => setIsSendingVoucher(true)}
                                  onSendingEnd={() => setIsSendingVoucher(false)}
                                  onStudentUpdate={handleStudentUpdate}
                                  disabled={loading || isSendingVoucher || isStudentInactive}
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="no-data-row">
                              No hay cuotas registradas para el año seleccionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <PaymentStudent
                      embedded
                      studentIdProp={studentId}
                      selectedYear={selectedYear}
                      searchQueryProp={paymentSearchQuery}
                      showEmbeddedControls={false}
                      isStudentInactive={isStudentInactive}
                    />
                  )}
                </div>
              </section>
              <ShareFormModal
                show={showModal}
                onHide={() => {
                  setShowModal(false);
                  setShareFormErrors({});
                }}
                selectedStudent={selectedStudent}
                selectedCuota={selectedCuota}
                availableMonths={availableMonths}
                months={MONTHS}
                onSave={handleSave}
                isEditing={isEditing}
                today={today}
                selectedYear={selectedYear}
                externalErrors={shareFormErrors}
                onClearExternalErrors={() => setShareFormErrors({})}
              />
              {showPaymentModal && (
                <div className="modal-overlay">
                  <div className="content-modal">
                    <div className="modal-header-payment">
                      <h2>{editMode ? "Editar Pago" : "Registrar Nuevo Pago"}</h2>
                      <button className="modal-close" onClick={handleClosePaymentModal} aria-label="Cerrar modal">
                        <FaTimes />
                      </button>
                    </div>
                    <div className="modal-body">
                      {paymentFormErrors.general && <div className="field-error" style={{ marginBottom: '12px', display: 'block' }}>{paymentFormErrors.general}</div>}
                      <form onSubmit={handleSubmitPayment}>
                        <div className="form-row">
                          <label>Concepto</label>
                          <select
                            name="concept"
                            value={paymentFormData.concept}
                            onChange={handlePaymentChange}
                            required
                            disabled={loading}
                            className={paymentFormErrors.concept ? "input-invalid" : ""}
                          >
                            <option value="">Seleccionar concepto</option>
                            {concepts.map((concept) => (
                              <option key={concept._id} value={concept.name}>
                                {concept.name.charAt(0).toUpperCase() + concept.name.slice(1)}
                              </option>
                            ))}
                          </select>
                          {paymentFormErrors.concept && <small className="field-error">{paymentFormErrors.concept}</small>}
                        </div>
                        <div className="form-row">
                          <label>Monto</label>
                          <input
                            type="number"
                            name="amount"
                            value={paymentFormData.amount}
                            onChange={handlePaymentChange}
                            required
                            min="0"
                            step="0.01"
                            placeholder="Ingrese el monto"
                            disabled={loading}
                            className={paymentFormErrors.amount ? "input-invalid" : ""}
                          />
                          {paymentFormErrors.amount && <small className="field-error">{paymentFormErrors.amount}</small>}
                        </div>
                        <div className="form-row">
                          <label>Fecha de Pago</label>
                          <input
                            type="date"
                            name="paymentDate"
                            value={paymentFormData.paymentDate}
                            onChange={handlePaymentChange}
                            required
                            max={today}
                            disabled={loading}
                            className={paymentFormErrors.paymentDate ? "input-invalid" : ""}
                          />
                          {paymentFormErrors.paymentDate && <small className="field-error">{paymentFormErrors.paymentDate}</small>}
                        </div>
                        <div className="form-row">
                          <label>Método de Pago</label>
                          <select
                            name="paymentMethod"
                            value={paymentFormData.paymentMethod}
                            onChange={handlePaymentChange}
                            required
                            disabled={loading}
                            className={paymentFormErrors.paymentMethod ? "input-invalid" : ""}
                          >
                            <option value="">Seleccionar método</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                          </select>
                          {paymentFormErrors.paymentMethod && <small className="field-error">{paymentFormErrors.paymentMethod}</small>}
                        </div>
                        <div className="modal-actions">
                          <button type="button" className="btn-cancel" onClick={handleClosePaymentModal}>
                            Cancelar
                          </button>
                          <button type="submit" className="btn-submit" disabled={loading}>
                            {editMode ? "Actualizar Pago" : "Guardar Pago"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
              {showConceptModal && (
                <div className="modal-overlay">
                  <div className="content-modal concept-modal">
                    <div className="modal-header-payment">
                      <h2>Gestionar Conceptos</h2>
                      <button className="modal-close" onClick={handleCloseConceptModal} aria-label="Cerrar modal">
                        <FaTimes />
                      </button>
                    </div>
                    <div className="modal-body">
                      <h3>Agregar Nuevo Concepto</h3>
                      <form onSubmit={handleAddConcept} className="payment-form">
                        <div className="form-row full-width-payment">
                          <label>Nombre del Concepto</label>
                          <input
                            type="text"
                            value={newConcept}
                            onChange={(e) => setNewConcept(e.target.value)}
                            required
                            placeholder="Ej: Liga de Yerba Buena"
                            maxLength="50"
                            disabled={loading}
                          />
                        </div>
                        <div className="modal-actions">
                          <button type="submit" className="btn-submit" disabled={loading}>
                            Guardar Concepto
                          </button>
                        </div>
                      </form>
                      <h3 className="titulo-concepto">Conceptos Existentes</h3>
                      <div className="concept-list">
                        {loadingConcepts ? (
                          <p className="no-data">Cargando conceptos...</p>
                        ) : concepts.length === 0 ? (
                          <p className="no-data">No hay conceptos registrados.</p>
                        ) : (
                          concepts.map((concept) => (
                            <div key={concept._id} className="concept-item">
                              <span className="concept-name">
                                {concept.name.charAt(0).toUpperCase() + concept.name.slice(1)}
                              </span>
                              <button
                                className="concept-delete-btn"
                                onClick={() =>
                                  handleDeleteConcept(
                                    concept._id.toString(),
                                    concept.name.charAt(0).toUpperCase() + concept.name.slice(1)
                                  )
                                }
                                aria-label={`Eliminar concepto ${concept.name}`}
                                disabled={loading}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button className="btn-cancel" onClick={handleCloseConceptModal}>
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {isSendingVoucher && (
                <div className="share-send-lock-overlay" aria-live="assertive" role="status">
                  <div className="share-send-lock-content">
                    <FaSpinner className="spinner" />
                    <h3>Enviando comprobante...</h3>
                    <p>No cierres ni cambies de sección hasta completar el envío.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareDetail;
