import React, { useContext, useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimes as FaTimesClear, FaTimes, FaSpinner } from "react-icons/fa";
import { StudentsContext } from "../../context/student/StudentContext";
import { PaymentContext } from "../../context/payment/PaymentContext";
import { LoginContext } from "../../context/login/LoginContext";
import { showConfirmAlert, showErrorAlert, showSuccessToast } from "../../utils/alerts/Alerts";
import SendPaymentVoucherEmail from "../voucherPayment/SendPaymentVoucerEmail";
import "./paymentStudent.css";
import { getFirstValidationMessage, isValidationErrorResponse, mapValidationErrors } from "../../utils/forms/validationErrors";

const PaymentStudent = ({
  embedded = false,
  studentIdProp = null,
  selectedYear = null,
  showEmbeddedControls = true,
  searchQueryProp = null,
  isStudentInactive = false,
}) => {
  const { estudiantes } = useContext(StudentsContext);
  const { payments, loadingPayments, fetchPaymentsByStudent, createPayment, deletePaymentConcept, updatePaymentConcept, concepts, loadingConcepts, fetchConcepts, createConcept, deleteConcept } = useContext(PaymentContext);
  const { authReady, auth } = useContext(LoginContext);
  const { id } = useParams();
  const location = useLocation();
  const resolvedStudentId = studentIdProp || id;
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
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
  const [formData, setFormData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    concept: "",
    studentId: resolvedStudentId,
  });
  const [editMode, setEditMode] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showConceptModal, setShowConceptModal] = useState(false);
  const [newConcept, setNewConcept] = useState("");
  const [isSendingVoucher, setIsSendingVoucher] = useState(false);
  const lastFetchKeyRef = useRef("");
  const shouldRedirect = !embedded;
  const isBusy = loadingPayments || loadingConcepts || isSendingVoucher;

  const capitalize = (value = "") =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

  useEffect(() => {
    const selectedStudent = estudiantes.find((est) => est._id === resolvedStudentId);
    setStudent(selectedStudent);
  }, [resolvedStudentId, estudiantes]);

  useEffect(() => {
    if (shouldRedirect) {
      return;
    }
    if (embedded && (!authReady || auth !== 'admin')) {
      return;
    }
    if (!authReady) {
      return;
    }
    if (auth !== 'admin') {
      showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
      navigate('/login');
      return;
    }

    const fetchKey = `${resolvedStudentId}-${auth}-${embedded ? 'embedded' : 'full'}`;
    if (lastFetchKeyRef.current === fetchKey) {
      return;
    }
    lastFetchKeyRef.current = fetchKey;

    const fetchData = async () => {
      try {
        await Promise.all([fetchPaymentsByStudent(resolvedStudentId), fetchConcepts()]);
      } catch (error) {
        console.error('PaymentStudent: Error fetching data:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        if (error.response?.status === 401) {
          showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
          navigate('/login');
        } else if (error.response?.status === 404) {
          showErrorAlert('¡Error!', 'Estudiante o datos no encontrados.');
        } else {
          showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudieron cargar los datos.');
        }
      }
    };
    fetchData();
  }, [resolvedStudentId, fetchPaymentsByStudent, fetchConcepts, authReady, auth, navigate, embedded, shouldRedirect]);

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
    if (!isSendingVoucher) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSendingVoucher]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }));
    setFormData({ ...formData, [name]: value });
  };

  const handleNewConceptChange = (e) => {
    setNewConcept(e.target.value);
  };

  const handleAddConcept = async (e) => {
    e.preventDefault();
    if (isStudentInactive) {
      return;
    }
    try {
      const normalizedConcept = newConcept.trim();
      if (!normalizedConcept) {
        showErrorAlert('¡Error!', 'El concepto no puede estar vacío.');
        return;
      }
      await createConcept(normalizedConcept);
      showSuccessToast('Concepto creado correctamente.');
      setNewConcept("");
      setShowConceptModal(false);
    } catch (error) {
      console.error('handleAddConcept: Error creating concept:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
        navigate('/login');
      } else if (error.response?.status === 400) {
        showErrorAlert('¡Error!', error.response?.data?.message || 'El concepto ya existe o es inválido.');
      } else {
        showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudo crear el concepto.');
      }
    }
  };

  const handleDeleteConcept = async (conceptId, conceptName) => {
    if (isStudentInactive) {
      return;
    }
    const confirmed = await showConfirmAlert(
      '¿Estás seguro?',
      `Eliminarás el concepto "${conceptName}". Esta acción no se puede deshacer.`
    );
    if (confirmed) {
      try {
        await deleteConcept(conceptId.toString());
        showSuccessToast('Concepto eliminado correctamente.');
      } catch (error) {
        console.error('handleDeleteConcept: Error deleting concept:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        if (error.response?.status === 401) {
          showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
          navigate('/login');
        } else {
          showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudo eliminar el concepto.');
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isStudentInactive) {
      return;
    }
    try {
      if (!formData.concept) {
        setFormErrors({ concept: 'Debe seleccionar un concepto.' });
        return;
      }

      const parsedAmount = Number(formData.amount);
      if (!formData.amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setFormErrors({ amount: 'El monto debe ser mayor a 0.' });
        return;
      }

      const paymentData = {
        ...formData,
        paymentDate: formData.paymentDate,
      };
      if (editMode) {
        await updatePaymentConcept(editPaymentId, paymentData);
        showSuccessToast('El pago ha sido actualizado correctamente.');
        setEditMode(false);
        setEditPaymentId(null);
      } else {
        await createPayment(paymentData);
        showSuccessToast('El pago ha sido registrado correctamente.');
      }
      resetForm();
      setShowModal(false);

    } catch (error) {
      console.error('handleSubmit: Error submitting payment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
        navigate('/login');
      } else if (isValidationErrorResponse(error)) {
        const errors = mapValidationErrors(error);
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
        } else {
          setFormErrors({ general: getFirstValidationMessage(error) || 'Los datos del pago son inválidos.' });
        }
      } else if (error.response?.status === 404) {
        showErrorAlert('¡Error!', 'Estudiante no encontrado.');
      } else {
        showErrorAlert('¡Error!', error.response?.data?.message || (editMode ? 'No se pudo actualizar el pago.' : 'No se pudo registrar el pago.'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      paymentDate: toInputDate(new Date()),
      paymentMethod: "",
      concept: "",
      studentId: resolvedStudentId,
    });
    setFormErrors({});
    setEditMode(false);
    setEditPaymentId(null);
  };

  const handleEdit = (payment) => {
    if (isStudentInactive) {
      return;
    }
    setEditMode(true);
    setEditPaymentId(payment._id);
    setFormData({
      studentId: payment.studentId,
      amount: payment.amount,
      paymentDate: toInputDate(payment.paymentDate),
      paymentMethod: payment.paymentMethod,
      concept: payment.concept,
    });
    setShowModal(true);
  };

  const handleOpenModal = () => {
    if (isStudentInactive) {
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
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
  const handleDelete = async (paymentId) => {
    if (isStudentInactive) {
      return;
    }
    const confirmed = await showConfirmAlert(
      '¿Estás seguro?',
      'No podrás revertir esta acción.'
    );
    if (confirmed) {
      try {
        await deletePaymentConcept(paymentId);
        showSuccessToast('El pago ha sido eliminado correctamente.');
      } catch (error) {

        console.error('handleDelete: Error deleting payment:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        if (error.response?.status === 401) {
          showErrorAlert('¡Error!', 'No estás autorizado. Por favor, inicia sesión nuevamente.');
          navigate('/login');
        } else {
          showErrorAlert('¡Error!', error.response?.data?.message || 'No se pudo eliminar el pago.');
        }
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      if (typeof dateString === "string") {
        const isoDateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDateMatch) {
          const [, year, month, day] = isoDateMatch;
          return `${day}/${month}/${year}`;
        }
      }

      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
    } catch (error) {
      console.error("formatDate: Error formatting date:", error);
      return dateString;
    }
  };

  const today = toInputDate(new Date());
  const isExternallyControlledSearch = typeof searchQueryProp === "string";
  const effectiveSearchQuery = isExternallyControlledSearch ? searchQueryProp : searchQuery;

  const normalizedPaymentSearch = effectiveSearchQuery.trim().toLowerCase();

  const filteredPayments = payments
    .filter((payment) => !selectedYear || new Date(payment.paymentDate).getFullYear().toString() === selectedYear)
    .filter((payment) => {
      if (!normalizedPaymentSearch) return true;

      const concept = String(payment.concept || "").toLowerCase();
      const method = String(payment.paymentMethod || "").toLowerCase();

      return (
        concept.includes(normalizedPaymentSearch) ||
        method.includes(normalizedPaymentSearch)
      );
    });


  const renderPaymentsTable = () => (
    <table className="payment-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Concepto</th>
          <th>Monto</th>
          <th>Fecha</th>
          <th>Método</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {loadingPayments ? (
          <tr>
            <td colSpan="6" className="no-data-row-payment">
              Cargando pagos...
            </td>
          </tr>
        ) : filteredPayments.length === 0 ? (
          <tr>
            <td colSpan="6" className="no-data-row-payment">
              No hay pagos registrados.
            </td>
          </tr>
        ) : (
          filteredPayments.map((payment, index) => (
            <tr key={payment._id}>
              <td>{index + 1}</td>
              <td>{capitalize(payment.concept)}</td>
              <td>${payment.amount.toLocaleString("es-ES")}</td>
              <td>{formatDate(payment.paymentDate)}</td>
              <td>{payment.paymentMethod}</td>
              <td>
                <div className="btn-action-container">
                  <button
                    className="action-btn-student"
                    onClick={() => handleEdit(payment)}
                    aria-label="Editar pago"
                    disabled={isBusy || isStudentInactive}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-btn-student"
                    onClick={() => handleDelete(payment._id)}
                    aria-label="Eliminar pago"
                    disabled={isBusy || isStudentInactive}
                  >
                    <FaTrash />
                  </button>
                  <SendPaymentVoucherEmail
                    student={student}
                    payment={payment}
                    onSendingStart={() => setIsSendingVoucher(true)}
                    onSendingEnd={() => setIsSendingVoucher(false)}
                    disabled={isBusy || isStudentInactive}
                  />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  const paymentModal = showModal && (
    <div className="modal-overlay">
      <div className="content-modal">
        <div className="modal-header-payment">
          <h2>{editMode ? "Editar Pago" : "Registrar Nuevo Pago"}</h2>
          <button
            className="modal-close"
            onClick={handleCloseModal}
            aria-label="Cerrar modal"
          >
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">
          {formErrors.general && <div className="field-error" style={{ marginBottom: '12px', display: 'block' }}>{formErrors.general}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>Concepto</label>
              <select
                name="concept"
                value={formData.concept}
                onChange={handleChange}
                required
                disabled={isBusy}
                className={formErrors.concept ? "input-invalid" : ""}
              >
                <option value="">Seleccionar concepto</option>
                {concepts.map((concept) => (
                  <option key={concept._id} value={concept.name}>
                    {capitalize(concept.name)}
                  </option>
                ))}
                {editMode &&
                  formData.concept &&
                  !concepts.some((c) => c.name === formData.concept) && (
                    <option value={formData.concept}>{capitalize(formData.concept)}</option>
                  )}
              </select>
              {formErrors.concept && <small className="field-error">{formErrors.concept}</small>}
            </div>
            <div className="form-row">
              <label>Monto</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                placeholder="Ingrese el monto"
                disabled={isBusy}
                className={formErrors.amount ? "input-invalid" : ""}
              />
              {formErrors.amount && <small className="field-error">{formErrors.amount}</small>}
            </div>
            <div className="form-row">
              <label>Fecha de Pago</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleChange}
                required
                max={today}
                disabled={isBusy}
                className={formErrors.paymentDate ? "input-invalid" : ""}
              />
              {formErrors.paymentDate && <small className="field-error">{formErrors.paymentDate}</small>}
            </div>
            <div className="form-row">
              <label>Método de Pago</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                required
                disabled={isBusy}
                className={formErrors.paymentMethod ? "input-invalid" : ""}
              >
                <option value="">Seleccionar método</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
              {formErrors.paymentMethod && <small className="field-error">{formErrors.paymentMethod}</small>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={isBusy}>
                {editMode ? "Actualizar Pago" : "Guardar Pago"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const conceptModal = showConceptModal && (
    <div className="modal-overlay">
      <div className="content-modal concept-modal">
        <div className="modal-header-payment">
          <h2>Gestionar Conceptos</h2>
          <button
            className="modal-close"
            onClick={handleCloseConceptModal}
            aria-label="Cerrar modal"
          >
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
                onChange={handleNewConceptChange}
                required
                placeholder="Ej: Liga de Yerba Buena"
                maxLength="50"
                disabled={isBusy}
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-submit" disabled={isBusy}>
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
                  <span className="concept-name">{capitalize(concept.name)}</span>
                  <button
                    className="concept-delete-btn"
                    onClick={() => handleDeleteConcept(concept._id.toString(), capitalize(concept.name))}
                    aria-label={`Eliminar concepto ${concept.name}`}
                    disabled={isBusy}
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
  );

  if (shouldRedirect) {
    const query = new URLSearchParams(location.search);
    query.set("tab", "pagos");
    return <Navigate to={`/share/${resolvedStudentId}?${query.toString()}`} replace />;
  }

  if (!student) {
    return (
      <div className="app-container error-container">
        <h2>Estudiante no encontrado</h2>
        <p>El estudiante con ID {id} no está disponible. Verifica los datos o vuelve a la lista de estudiantes.</p>
        <button className="btn-back" onClick={() => navigate('/student')}>
          Volver a la lista de estudiantes
        </button>
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        {showEmbeddedControls && (
          <>
            <section className="search-section">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Buscar pagos..."
                  className="search-input"
                  value={effectiveSearchQuery}
                  onChange={(e) => {
                    if (!isExternallyControlledSearch) {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  disabled={isBusy || isExternallyControlledSearch}
                />
                {effectiveSearchQuery && !isExternallyControlledSearch && (
                  <button
                    className="search-clear"
                    onClick={() => setSearchQuery("")}
                    disabled={isBusy}
                  >
                    <FaTimesClear />
                  </button>
                )}
              </div>
            </section>
            <div className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '12px' }}>
              <button
                className="quick-action-btn"
                onClick={handleOpenModal}
                disabled={isBusy || isStudentInactive}
              >
                <FaPlus className="btn-icon" />
                <span>Añadir Pago</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={handleOpenConceptModal}
                disabled={isBusy || isStudentInactive}
              >
                <FaPlus className="btn-icon" />
                <span>Crear Concepto</span>
              </button>
            </div>
          </>
        )}
        {renderPaymentsTable()}
        {paymentModal}
        {conceptModal}
        {isSendingVoucher && (
          <div className="payment-send-lock-overlay" aria-live="assertive" role="status">
            <div className="payment-send-lock-content">
              <FaSpinner className="spinner" />
              <h3>Enviando comprobante...</h3>
              <p>No cierres ni cambies de sección hasta completar el envío.</p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`app-container ${windowWidth <= 576 ? "mobile-view" : ""}`}>
      {paymentModal}
      {conceptModal}
    </div>
  );


};

export default PaymentStudent;
