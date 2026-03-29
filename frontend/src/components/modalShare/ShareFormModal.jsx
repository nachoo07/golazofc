import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import "./shareFormModal.css";

const ShareFormModal = ({
  show,
  onHide,
  selectedStudent,
  selectedCuota,
  availableMonths,
  months,
  onSave,
  isEditing,
  today,
  selectedYear,
  externalErrors = {},
  onClearExternalErrors = () => { },
}) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [formErrors, setFormErrors] = useState({});

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

  useEffect(() => {
    if (Object.keys(externalErrors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...externalErrors }));
    }
  }, [externalErrors]);

  useEffect(() => {
    if (show && selectedCuota && selectedCuota._id) {
      const hasExistingPaymentDate = Boolean(selectedCuota.paymentdate);

      setAmount(selectedCuota.amount?.toString() || "");
      setDate(
        hasExistingPaymentDate
          ? toInputDate(selectedCuota.paymentdate)
          : (today || "")
      );
      setPaymentMethod(selectedCuota.paymentmethod || "");
      setSelectedMonth(selectedCuota.date ? new Date(selectedCuota.date).getMonth().toString() : "");
      setFormErrors({});
    } else if (!show || !selectedCuota) {
      resetForm();
    }
  }, [show, selectedCuota, today]);

  const resetForm = () => {
    setAmount("");
    setDate(today || "");
    setPaymentMethod("");
    setSelectedMonth("");
    setFormErrors({});
  };

  const validateForm = () => {
    const minDate = toInputDate(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));
    const maxAmount = 1000000;
    const nextErrors = {};

    const hasPaymentDate = Boolean(date);
    const hasPaymentMethod = Boolean(paymentMethod);

    if (selectedMonth === "") nextErrors.selectedMonth = "Debes seleccionar un mes.";
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0 || Number(amount) > maxAmount) {
      nextErrors.amount = `El monto debe ser mayor a 0 y menor o igual a ${maxAmount}.`;
    }

    if (hasPaymentDate !== hasPaymentMethod) {
      if (!hasPaymentDate) nextErrors.date = "Debes cargar la fecha de pago.";
      if (!hasPaymentMethod) nextErrors.paymentMethod = "Debes seleccionar un método de pago.";
    }

    if (hasPaymentDate && (date > today || date < minDate)) {
      nextErrors.date = "La fecha de pago ingresada no es válida.";
    }

    if (selectedStudent?.state === "Inactivo") {
      nextErrors.general = "No se puede crear ni actualizar cuotas para un estudiante inactivo.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };


  const handleSave = () => {
    if (!validateForm()) return;

    const cuotaYear = selectedYear || new Date().getFullYear().toString();
    const cuotaDate = `${cuotaYear}-${String(parseInt(selectedMonth, 10) + 1).padStart(2, "0")}-01`;

    const cuotaData = {
      student: selectedStudent?._id,
      amount: parseFloat(amount),
      date: cuotaDate,
    };

    if (paymentMethod) {
      cuotaData.paymentmethod = paymentMethod;
    }

    if (date) {
      cuotaData.paymentdate = date;
    }

    if (selectedCuota && selectedCuota._id) {
      cuotaData._id = selectedCuota._id;
    }

    onSave(cuotaData);
  };

  const handleCancel = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton className="modal-header-share">
        <Modal.Title className='modal-title-share'>{isEditing ? "Editar Cuota" : "Crear Cuota"}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-share">
        {formErrors.general && <div className="share-inline-error">{formErrors.general}</div>}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Mes</Form.Label>
            {isEditing ? (
              <Form.Select value={selectedMonth} disabled>
                <option value={selectedMonth}>
                  {selectedMonth !== "" ? months[parseInt(selectedMonth)] : "Mes no disponible"}
                </option>
              </Form.Select>
            ) : (
              <Form.Select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setFormErrors((prev) => ({ ...prev, selectedMonth: undefined, general: undefined }));
                  onClearExternalErrors();
                }}
                isInvalid={Boolean(formErrors.selectedMonth)}
              >
                <option value="">Selecciona un mes</option>
                {availableMonths.map((month, index) => (
                  <option key={index} value={months.indexOf(month)}>
                    {month}
                  </option>
                ))}
              </Form.Select>
            )}
            {!isEditing && formErrors.selectedMonth && (
              <Form.Control.Feedback type="invalid" style={{ display: "block" }}>
                {formErrors.selectedMonth}
              </Form.Control.Feedback>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Monto</Form.Label>
            <Form.Control
              type="number"
              min="0.01"
              max={1000000}
              step="1000"
              placeholder="Monto"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFormErrors((prev) => ({ ...prev, amount: undefined, general: undefined }));
                onClearExternalErrors();
              }}
              isInvalid={Boolean(formErrors.amount)}
            />
            <Form.Control.Feedback type="invalid">{formErrors.amount}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fecha de Pago</Form.Label>
            <Form.Control
              type="date"
              max={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setFormErrors((prev) => ({ ...prev, date: undefined, general: undefined }));
                onClearExternalErrors();
              }}
              isInvalid={Boolean(formErrors.date)}
            />
            <Form.Control.Feedback type="invalid">{formErrors.date}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Método de Pago</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setFormErrors((prev) => ({ ...prev, paymentMethod: undefined, general: undefined }));
                onClearExternalErrors();
              }}
              required
              isInvalid={Boolean(formErrors.paymentMethod)}
            >
              <option value="">Selecciona un método</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">{formErrors.paymentMethod}</Form.Control.Feedback>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="modal-footer-share">
        <Button className="btn-modal-cancelar" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button className="btn-modal-guardar" onClick={handleSave}>
          Guardar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ShareFormModal;
