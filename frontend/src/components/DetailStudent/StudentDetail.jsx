import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from 'react-icons/fa';
import { StudentsContext } from "../../context/student/StudentContext";
import { LoginContext } from "../../context/login/LoginContext";
import "./detailStudent.css";
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import DesktopNavbar from '../navbar/DesktopNavbar';
import Sidebar from '../sidebar/Sidebar';

const StudentDetail = () => {
  const { obtenerEstudiantePorId, selectedStudent, loading } = useContext(StudentsContext);
  useContext(LoginContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    obtenerEstudiantePorId(id);
  }, [id, obtenerEstudiantePorId]);

  const formatDate = (date, timeZone = 'UTC') => {
    if (!date) return '';
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).format(parsedDate);
  };


  const handleViewShares = () => {
    const queryString = location.search;
    navigate(`/share/${id}${queryString}`);
  };

  const handleViewPayments = () => {
    const queryString = location.search;
    navigate(`/paymentstudent/${id}${queryString}`);
  };

  const handleBack = () => {
    navigate(`/student${location.search}`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="student-detail-feedback">
          <h3 className="student-detail-feedback-title">Cargando detalle del alumno...</h3>
        </div>
      );
    }

    if (!selectedStudent || selectedStudent._id !== id) {
      return (
        <div className="student-detail-feedback">
          <h3 className="student-detail-feedback-title">No se encontró el alumno solicitado.</h3>
          <button className="action-btn-header" onClick={handleBack}>
            <FaArrowLeft /> Volver al listado
          </button>
        </div>
      );
    }

    return (
      <div className="perfil-container">
        <div className="perfil-header">
          <div className="perfil-avatar">
            <img
              src={selectedStudent.profileImage}
              alt="Perfil"
              onError={(e) => {
                e.target.src = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
              }}
              className="avatar-img"
            />
          </div>
          <div className="perfil-info">
            <h2>{selectedStudent?.name} {selectedStudent?.lastName}</h2>
            <p className="perfil-status">Estado: <span className={`state-${selectedStudent?.state?.toLowerCase()}`}>{selectedStudent?.state}</span></p>
            <div className="perfil-buttons">
              <button className="action-btn-header" onClick={handleViewShares}>
                Cuotas
              </button>
              <button className="action-btn-header" onClick={handleViewPayments}>
                Pagos
              </button>
              <button className="action-btn-header" onClick={handleBack}>
                <FaArrowLeft /> Volver Atrás
              </button>
            </div>
          </div>
        </div>
        <div className="perfil-details">
          <div className="details-section">
            <h3>Información Personal</h3>
            <div className="details-row">
              <div className="form-group">
                <label className="label-text">DNI</label>
                <input type="text" value={selectedStudent?.dni || ''} readOnly className="form-control-custom" />
              </div>
              <div className="form-group">
                <label className="label-text">Fecha de Nacimiento</label>
                <input type="text" value={formatDate(selectedStudent?.birthDate)} readOnly className="form-control-custom" />
              </div>
              <div className="form-group">
                <label className="label-text">Fecha de Alta</label>
                <input
                  type="text"
                  value={formatDate(selectedStudent?.createdAt, 'America/Argentina/Tucuman')}
                  readOnly
                  className="form-control-custom"
                />
              </div>
              <div className="form-group">
                <label className="label-text">Dirección</label>
                <input type="text" value={selectedStudent?.address || ''} readOnly className="form-control-custom" />
              </div>
            </div>

          </div>
          <div className="details-section">
            <h3>Información de Contacto</h3>
            <div className="details-row">
              <div className="form-group">
                <label className="label-text">Email</label>
                <input type="text" value={selectedStudent?.mail || ''} readOnly className="form-control-custom" />
              </div>
              <div className="form-group">
                <label className="label-text">Nombre del Tutor</label>
                <input type="text" value={selectedStudent?.guardianName || ''} readOnly className="form-control-custom" />
              </div>
              <div className="form-group">
                <label className="label-text">Teléfono del Tutor</label>
                <input type="text" value={selectedStudent?.guardianPhone || ''} readOnly className="form-control-custom" />
              </div>
            </div>
          </div>
          <div className="details-container">
            <div className="details-section">
              <h3>Otros Datos</h3>
              <div className="details-row">
                <div className="form-group">
                  <label className="label-text">Categoría</label>
                  <input type="text" value={selectedStudent?.category || ''} readOnly className="form-control-custom" />
                </div>
                <div className="form-group">
                  <label className="label-text">Descuento por Hermanos</label>
                  <input type="text" value={selectedStudent?.hasSiblingDiscount ? 'Sí' : 'No'} readOnly className="form-control-custom" />
                </div>
                <div className="form-group">
                  <label className="label-text">Seguro</label>
                  <input
                    type="text"
                    value={selectedStudent?.sure === 'Si' ? 'Si' : selectedStudent?.sure === 'No' ? 'No' : 'No especificado'}
                    readOnly
                    className="form-control-custom"
                  />
                </div>
                <div className="form-group">
                  <label className="label-text">Liga</label>
                  <input
                    type="text"
                    value={selectedStudent?.league === 'Si' ? 'Si' : selectedStudent?.league === 'No' ? 'No' : 'No especificado'}
                    readOnly
                    className="form-control-custom"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
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
          activeRoute="/student"
        />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StudentDetail;