import React, { useState, useContext, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { StudentsContext } from '../../context/student/StudentContext';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData }) => {
  const { loading } = useContext(StudentsContext);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [localFormData, setLocalFormData] = useState({ ...formData });

  useEffect(() => {
    const normalizedDate = formData.dateInputValue instanceof Date
      ? formData.dateInputValue.toISOString().split('T')[0]
      : formData.dateInputValue || '';
    setLocalFormData(prev => ({
      ...prev,
      dateInputValue: normalizedDate,
      name: formData.name || '',
      lastName: formData.lastName || '',
      dni: formData.dni || '',
      address: formData.address || '',
      mail: formData.mail || '',
      category: formData.category || '',
      guardianName: formData.guardianName || '',
      guardianPhone: formData.guardianPhone || '',
      state: formData.state || 'Activo',
      sure: formData.sure || '',
      league: formData.league || '',
      hasSiblingDiscount: formData.hasSiblingDiscount || false,
      profileImage: formData.profileImage || null,
    }));
  }, [formData]);

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
    const newValue = name === 'name' || name === 'lastName' || name === 'guardianName'
      ? capitalizeWords(value)
      : value;
    setLocalFormData(prev => ({ ...prev, [name]: newValue }));
    handleChange({ target: { name, value: newValue } });
  };

  const handleNumberInput = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setLocalFormData(prev => ({ ...prev, [e.target.name]: value }));
    handleChange({ target: { name: e.target.name, value } });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleChange({ target: { name: 'profileImage', value: file } });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    // Validación para asegurar que sure y league tengan un valor válido

    // Validación de DNI (7-9 dígitos)
    if (localFormData.dni && !/^\d{7,9}$/.test(localFormData.dni)) {
      setAlertMessage('El DNI debe contener entre 7 y 9 dígitos.');
      setShowAlert(true);
      return;
    }
    handleSubmit(e);
  };

  const maxDate = new Date(new Date().setUTCHours(0, 0, 0, 0)).getTime() + 86399999;
  const formattedMaxDate = new Date(maxDate).toISOString().split('T')[0];

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
              value={localFormData.name || ''}
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
              value={localFormData.lastName || ''}
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
              value={localFormData.dni || ''}
              onChange={handleNumberInput}
              required
              className="form-control-custom"
            />
          </Form.Group>
          <Form.Group controlId="formBirthDate" className="studentFormModal-form-group">
            <Form.Label>Fecha de Nacimiento</Form.Label>
            <Form.Control
              type="date"
              name="dateInputValue"
              value={localFormData.dateInputValue || ''}
              onChange={handleInputChange}
              max={formattedMaxDate}
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
              value={localFormData.address || ''}
              onChange={handleInputChange}
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
              value={localFormData.mail || ''}
              onChange={handleInputChange}
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
              value={localFormData.category || ''}
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
              value={localFormData.guardianName || ''}
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
              value={localFormData.guardianPhone || ''}
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
              value={localFormData.state || 'Activo'}
              onChange={handleInputChange}
              className="form-control-custom"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </Form.Control>
          </Form.Group>
          <Form.Group controlId="formSure" className="studentFormModal-form-group">
            <Form.Label>Seguro</Form.Label>
            <Form.Select
              name="sure"
              value={localFormData.sure || ''}
              onChange={handleInputChange}
              className="form-control-custom"
            >
              <option value="">No especificado</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="formLeague" className="studentFormModal-form-group">
            <Form.Label>Liga</Form.Label>
            <Form.Select
              name="league"
              value={localFormData.league || ''}
              onChange={handleInputChange}
              className="form-control-custom"
            >
              <option value="">No especificado</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </Form.Select>
          </Form.Group>
          <Form.Group controlId="formHasSiblingDiscount" className="studentFormModal-checkbox-group">
            <Form.Check
              type="checkbox"
              name="hasSiblingDiscount"
              checked={localFormData.hasSiblingDiscount || false}
              onChange={(e) => {
                const value = e.target.checked;
                setLocalFormData(prev => ({ ...prev, hasSiblingDiscount: value }));
                handleChange({ target: { name: 'hasSiblingDiscount', value } });
              }}
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
            {localFormData.profileImage && (
              <div className="studentFormModal-image-preview-container">
                <img
                  src={localFormData.profileImage instanceof File ? URL.createObjectURL(localFormData.profileImage) : localFormData.profileImage}
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