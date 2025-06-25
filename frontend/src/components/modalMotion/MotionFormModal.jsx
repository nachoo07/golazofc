import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "./modalFormModal.css";
dayjs.extend(utc);

const MotionFormModal = ({
  show,
  onHide,
  onSave,
  selectedMotion,
  isEditing,
  today,
}) => {
  const [formData, setFormData] = useState({
    concept: "",
    amount: "",
    paymentMethod: "",
    selectedDate: "",
    incomeType: "",
  });
  const [alertMessage, setAlertMessage] = useState("");

  // Cargar datos del movimiento cuando se edita
  useEffect(() => {
    if (selectedMotion) {
      setFormData({
        concept: selectedMotion.concept || "",
        amount: selectedMotion.amount ? selectedMotion.amount.toString() : "",
        paymentMethod: selectedMotion.paymentMethod || "",
        selectedDate: selectedMotion.date
          ? dayjs.utc(selectedMotion.date).format("YYYY-MM-DD")
          : "",
        incomeType: selectedMotion.incomeType || "",
      });
    } else {
      resetForm();
    }
  }, [selectedMotion]);

  const resetForm = () => {
    setFormData({
      concept: "",
      amount: "",
      paymentMethod: "",
      selectedDate: "",
      incomeType: "",
    });
    setAlertMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (
      !formData.concept ||
      !formData.amount ||
      !formData.paymentMethod ||
      !formData.selectedDate ||
      !formData.incomeType
    ) {
      setAlertMessage("Por favor, completa todos los campos.");
      return;
    }

    const motionData = {
      concept: formData.concept,
      amount: parseFloat(formData.amount),
      paymentMethod: formData.paymentMethod,
      date: dayjs.utc(formData.selectedDate).toDate(),
      incomeType: formData.incomeType,
    };

    if (selectedMotion) {
      motionData._id = selectedMotion._id;
    }

    onSave(motionData);
    resetForm();
    onHide();
  };

  const handleCancel = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header className="modal-header-motion" closeButton>
        <Modal.Title className="modal-title-motion">
          {isEditing ? "Editar Movimiento" : "Agregar Movimiento"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-motion">
        {alertMessage && (
          <div className="alert alert-warning" role="alert">
            {alertMessage}
          </div>
        )}
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Concepto</Form.Label>
            <Form.Control
              type="text"
              name="concept"
              value={formData.concept}
              onChange={handleInputChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fecha</Form.Label>
            <Form.Control
              type="date"
              name="selectedDate"
              max={today}
              value={formData.selectedDate}
              onChange={handleInputChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Monto</Form.Label>
            <Form.Control
              type="number"
              name="amount"
              min="0"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Método de Pago</Form.Label>
            <Form.Select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              required
            >
              <option value="">Método de Pago</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tipo</Form.Label>
            <Form.Select
              name="incomeType"
              value={formData.incomeType}
              onChange={handleInputChange}
              required
            >
              <option value="">Tipo</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer className="modal-footer-motion">
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

export default MotionFormModal;