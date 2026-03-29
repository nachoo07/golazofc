import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { StudentsContext } from '../../context/student/StudentContext';
import './studentModal.css';

const StudentFormModal = ({ show, handleClose, handleSubmit, handleChange, formData, formErrors = {} }) => {
  const { loading } = useContext(StudentsContext);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    handleChange({
      target: {
        name: 'profileImage',
        files: file ? [file] : [],
        type: 'file',
      },
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
  };

  const today = new Date().toISOString().split('T')[0];

  const previewSource = useMemo(() => {
    if (!formData.profileImage) return '';
    if (formData.profileImage instanceof File) return URL.createObjectURL(formData.profileImage);
    return formData.profileImage;
  }, [formData.profileImage]);

  useEffect(() => {
    setPreviewUrl(previewSource);
    return () => {
      if (previewSource && previewSource.startsWith('blob:')) {
        URL.revokeObjectURL(previewSource);
      }
    };
  }, [previewSource]);

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
        <Form onSubmit={onSubmit} className="studentFormModal-form-grid" encType="multipart/form-data">
          {formErrors.general && (
            <div className="studentFormModal-full-width-img">
              <div className="invalid-feedback" style={{ display: 'block' }}>{formErrors.general}</div>
            </div>
          )}
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
              className={`form-control-custom ${formErrors.name ? 'is-invalid' : ''}`}
            />
            {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
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
              className={`form-control-custom ${formErrors.lastName ? 'is-invalid' : ''}`}
            />
            {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
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
              title="El DNI debe contener entre 7 y 9 dígitos."
              className={`form-control-custom ${formErrors.dni ? 'is-invalid' : ''}`}
            />
            {formErrors.dni && <div className="invalid-feedback">{formErrors.dni}</div>}
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
              className={`form-control-custom ${formErrors.dateInputValue ? 'is-invalid' : ''}`}
            />
            {formErrors.dateInputValue && <div className="invalid-feedback">{formErrors.dateInputValue}</div>}
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
              minLength={5}
              className={`form-control-custom ${formErrors.address ? 'is-invalid' : ''}`}
            />
            {formErrors.address && <div className="invalid-feedback">{formErrors.address}</div>}
          </Form.Group>
          <Form.Group controlId="formMail" className="studentFormModal-form-group">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              placeholder="Email"
              name="mail"
              value={formData.mail || ''}
              required
              onChange={handleChange}
              pattern="\S+@\S+\.\S+"
              title="Formato de email inválido."
              className={`form-control-custom ${formErrors.mail ? 'is-invalid' : ''}`}
            />
            {formErrors.mail && <div className="invalid-feedback">{formErrors.mail}</div>}
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
              className={`form-control-custom ${formErrors.category ? 'is-invalid' : ''}`}
            />
            {formErrors.category && <div className="invalid-feedback">{formErrors.category}</div>}
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
              className={`form-control-custom ${formErrors.guardianName ? 'is-invalid' : ''}`}
            />
            {formErrors.guardianName && <div className="invalid-feedback">{formErrors.guardianName}</div>}
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
              className={`form-control-custom ${formErrors.guardianPhone ? 'is-invalid' : ''}`}
            />
            {formErrors.guardianPhone && <div className="invalid-feedback">{formErrors.guardianPhone}</div>}
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
          <Form.Group controlId="formSure" className="studentFormModal-form-group">
            <Form.Label>Seguro</Form.Label>
            <Form.Select
              name="sure"
              value={formData.sure ?? ''}
              onChange={handleChange}
              className={`form-control-custom ${formErrors.sure ? 'is-invalid' : ''}`}
            >
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </Form.Select>
            {formErrors.sure && <div className="invalid-feedback">{formErrors.sure}</div>}
          </Form.Group>
          <Form.Group controlId="formLeague" className="studentFormModal-form-group">
            <Form.Label>Liga</Form.Label>
            <Form.Select
              name="league"
              value={formData.league ?? ''}
              onChange={handleChange}
              className={`form-control-custom ${formErrors.league ? 'is-invalid' : ''}`}
            >
              <option value="">Seleccionar</option>
              <option value="Si">Sí</option>
              <option value="No">No</option>
            </Form.Select>
            {formErrors.league && <div className="invalid-feedback">{formErrors.league}</div>}
          </Form.Group>
          <Form.Group controlId="formHasSiblingDiscount" className="studentFormModal-checkbox-group">
            <Form.Check
              type="checkbox"
              name="hasSiblingDiscount"
              checked={formData.hasSiblingDiscount || false}
              onChange={(e) =>
                handleChange({
                  target: {
                    name: e.target.name,
                    checked: e.target.checked,
                    type: 'checkbox',
                  },
                })
              }
              label="10% de descuento por hermanos"
              className="studentFormModal-form-check-custom"
            />
          </Form.Group>
          <Form.Group controlId="formProfileImage" className="studentFormModal-full-width-img">
            <div className="studentFormModal-image-upload-container">
              <Form.Label>Imagen de Perfil</Form.Label>
              <Form.Control
                type="file"
                name="profileImage"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp,image/gif"
                onChange={handleFileChange}
                disabled={loading}
                className="form-control-custom"
              />
            </div>
            {previewUrl && (
              <div className="studentFormModal-image-preview-container">
                <img
                  src={previewUrl}
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
