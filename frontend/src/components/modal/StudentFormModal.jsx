import React, { useState, useContext } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { StudentsContext } from '../../context/student/StudentContext';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData }) => {
  const { loading } = useContext(StudentsContext);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const capitalizeWords = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    handleChange({
      target: {
        name,
        value:
          name === 'name' || name === 'lastName' || name === 'guardianName'
            ? capitalizeWords(value)
            : value,
      },
    });
  };

  const handleNumberInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    handleChange({ target: { name: e.target.name, value } });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleChange({ target: { name: 'profileImage', value: file } });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      show={show}
      onHide={handleClose}
      dialogClassName="studentFormModal-container"
      size="lg"
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton className="studentFormModal-header">
        <Modal.Title className="studentFormModal-title">
          {formData._id ? 'Editar Alumno' : 'Agregar Alumno'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="studentFormModal-body">
        {showAlert && (
          <Alert
            variant="warning"
            onClose={() => setShowAlert(false)}
            dismissible
            className="custom-alert"
          >
            <Alert.Heading>¡Atención!</Alert.Heading>
            <p>{alertMessage}</p>
          </Alert>
        )}
        <Form onSubmit={onSubmit} className="studentFormModal-form-grid" encType="multipart/form-data">
          <Form.Group controlId="formNombre" className="studentFormModal-form-group">
            <Form.Label>Nombre</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Juan"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              required
              maxLength={50}
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formLastName" className="studentFormModal-form-group">
            <Form.Label>Apellido</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Pérez"
              name="lastName"
              value={formData.lastName || ''}
              onChange={handleInputChange}
              required
              maxLength={50}
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formDNI" className="studentFormModal-form-group">
            <Form.Label>DNI</Form.Label>
            <Form.Control
              type="text"
              placeholder="DNI"
              name="dni"
              value={formData.dni || ''}
              onChange={handleNumberInput}
              required
              pattern="\d{7,9}"
              title="DNI debe contener 7 a 9 dígitos."
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formBirthDate" className="studentFormModal-form-group">
            <Form.Label>Fecha de Nacimiento</Form.Label>
            <Form.Control
              type="date"
              name="dateInputValue"
              value={formData.dateInputValue || ''}
              onChange={handleChange}
              max={today}
              required
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formDireccion" className="studentFormModal-form-group">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              type="text"
              placeholder="Dirección"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              required
              maxLength={100}
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formMail" className="studentFormModal-form-group">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Email"
              name="mail"
              value={formData.mail || ''}
              onChange={handleChange}
              pattern="\S+@\S+\.\S+"
              title="Formato de email inválido."
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formCategoria" className="studentFormModal-form-group">
            <Form.Label>Categoría</Form.Label>
            <Form.Control
              type="text"
              placeholder="Categoría"
              name="category"
              value={formData.category || ''}
              onChange={handleInputChange}
              required
              maxLength={50}
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formGuardianName" className="studentFormModal-form-group">
            <Form.Label>Nombre del Tutor</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nombre del Tutor"
              name="guardianName"
              value={formData.guardianName || ''}
              onChange={handleInputChange}
              maxLength={50}
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formGuardianPhone" className="studentFormModal-form-group">
            <Form.Label>Teléfono del Tutor</Form.Label>
            <Form.Control
              type="text"
              placeholder="Teléfono del Tutor"
              name="guardianPhone"
              value={formData.guardianPhone || ''}
              onChange={handleNumberInput}
              pattern="\d{10,15}"
              title="El número debe tener entre 10 y 15 dígitos."
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formState" className="studentFormModal-form-group">
            <Form.Label>Estado</Form.Label>
            <Form.Control
              as="select"
              name="state"
              value={formData.state || 'Activo'}
              onChange={handleChange}
              className="form-control-custom"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </Form.Control>
          </Form.Group>
          <Form.Group controlId="formHasSiblingDiscount" className="studentFormModal-checkbox-group">
            <Form.Check
              type="checkbox"
              name="hasSiblingDiscount"
              checked={formData.hasSiblingDiscount || false}
              onChange={(e) => handleChange({ target: { name: e.target.name, value: e.target.checked } })}
              label="Aplicar 10% de descuento por hermanos"
              className="studentFormModal-form-check-custom"
            />
          </Form.Group>
          <Form.Group controlId="formProfileImage" className="studentFormModal-full-width-img">
            <div className="studentFormModal-image-upload-container">
              <Form.Label>Imagen de Perfil</Form.Label>
              <Form.Control
                type="file"
                name="profileImage"
                onChange={handleFileChange}
                disabled={loading}
                className="form-control-custom"
              />
            </div>
            {formData.profileImage && (
              <div className="studentFormModal-image-preview-container">
                <img
                  src={formData.profileImage instanceof File ? URL.createObjectURL(formData.profileImage) : formData.profileImage}
                  alt="Vista previa"
                  className="studentFormModal-preview-img"
                  onError={(e) => (e.target.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg')}
                />
              </div>
            )}
          </Form.Group>
          <div className="studentFormModal-buttons-container">
            <Button type="button" className="studentFormModal-cancel-btn" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" className="studentFormModal-save-btn" disabled={loading}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                formData._id ? 'Actualizar' : 'Guardar'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default StudentFormModal;