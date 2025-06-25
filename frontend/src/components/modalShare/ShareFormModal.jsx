import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import AlertCustom from "../alert/AlertCustom"; // Ajusta la ruta
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
}) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("error"); // Añadir estado para el tipo de alerta

  useEffect(() => {
    if (show && selectedCuota && selectedCuota._id) {
      setAmount(selectedCuota.amount?.toString() || "");
      setDate(selectedCuota.paymentdate ? formatDate(selectedCuota.paymentdate) : "");
      setPaymentMethod(selectedCuota.paymentmethod || "");
      setSelectedMonth(selectedCuota.date ? new Date(selectedCuota.date).getMonth().toString() : "");
    } else if (!show || !selectedCuota) {
      resetForm();
    }
  }, [show, selectedCuota]);

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toISOString().split("T")[0] : "";

  const resetForm = () => {
    setAmount("");
    setDate("");
    setPaymentMethod("");
    setSelectedMonth("");
    setAlertMessage("");
    setShowAlert(false);
    setAlertType("error");
  };

  const validateForm = () => {
    const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split("T")[0];
    const maxAmount = 1000000;



    if (selectedMonth === "") {
      setAlertMessage("Debes seleccionar un mes.");
      setShowAlert(true);
      setAlertType("error");
      return false;
    }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount) {
      setAlertMessage(`El monto debe ser un número positivo menor o igual a ${maxAmount}.`);
      setShowAlert(true);
      setAlertType("error");
      return false;
    }
       if (!date || new Date(date) > new Date(today) || new Date(date) < new Date(minDate)) {
      setAlertMessage(`La fecha de pago debe estar entre ${minDate} y ${today}.`);
      setShowAlert(true);
      setAlertType("error");
      return false;
    }

    if (!paymentMethod || paymentMethod === "") {
      setAlertMessage("Debes seleccionar un método de pago.");
      setShowAlert(true);
      setAlertType("error");
      return false;
    }

    if (selectedStudent?.state === "Inactivo") {
      setAlertMessage("No se puede crear ni actualizar cuotas para un estudiante inactivo.");
      setShowAlert(true);
      setAlertType("error");
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const cuotaDate = new Date(new Date().getFullYear(), parseInt(selectedMonth), 1);

    const cuotaData = {
      student: selectedStudent?._id,
      amount: parseFloat(amount),
      date: cuotaDate,
      paymentmethod: paymentMethod,
      paymentdate: date,
    };

    if (selectedCuota && selectedCuota._id) {
      cuotaData._id = selectedCuota._id;
    }

    onSave(cuotaData);
    
    // Mostrar mensaje de éxito
    setAlertMessage("La cuota ha sido actualizada correctamente.");
    setAlertType("success");
    setShowAlert(true);
    
    // Esperar brevemente para que se vea el mensaje antes de cerrar
    setTimeout(() => {
      resetForm();
      onHide();
    }, 1500);
  };

  const handleCancel = () => {
    resetForm();
    onHide();
  };

  const handleAlertClose = () => {
    setShowAlert(false);
  };
  return (
    <Modal show={show} onHide={handleCancel} centered>
      <Modal.Header closeButton className="modal-header-share">
        <Modal.Title className='modal-title-share'>{isEditing ? "Editar Cuota" : "Crear Cuota"}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="modal-body-share">
        {showAlert && (
            <AlertCustom 
            message={alertType === "success" ? "ÉXITO\n" + alertMessage : alertMessage} 
            type={alertType} 
            onClose={handleAlertClose} 
          />
        )}
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
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">Selecciona un mes</option>
                {availableMonths.map((month, index) => (
                  <option key={index} value={months.indexOf(month)}>
                    {month}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Monto</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max={1000000}
              step="1000"
              placeholder="Monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Fecha de Pago</Form.Label>
            <Form.Control
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Método de Pago</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="">Selecciona un método</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </Form.Select>
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