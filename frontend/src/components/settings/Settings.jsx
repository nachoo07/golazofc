import React, { useState, useEffect, useContext, useMemo } from 'react';
import { SharesContext } from '../../context/share/ShareContext';
import { LoginContext } from '../../context/login/LoginContext';
import client from '../../api/axios';
import { FaInfoCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import Swal from 'sweetalert2';
import './settings.css';
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import DesktopNavbar from '../navbar/DesktopNavbar';
import Sidebar from '../sidebar/Sidebar';

const Settings = () => {
  const { obtenerCuotas } = useContext(SharesContext);
  const { auth, authReady } = useContext(LoginContext);
  const [cuotaBase, setCuotaBase] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const today = useMemo(() => new Date(), []);
  const dayOfMonth = today.getDate();
  const isUpdateWindow = dayOfMonth >= 1 && dayOfMonth <= 10;


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
    const fetchData = async () => {
      if (!authReady) return;
      if (auth !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await client.get('/config/cuotaBase');
        setCuotaBase(response.data.value || 30000);
      } catch {
        setCuotaBase(30000);
        Swal.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [auth, authReady]);

  const handleSaveCuotaBase = async () => {
    setLoading(true);
    try {
      const newValue = parseFloat(cuotaBase);
      if (Number.isNaN(newValue) || newValue <= 0) {
        Swal.fire('Error', 'El monto debe ser un número positivo.', 'error');
        return;
      }

      await client.post(
        '/config/set',
        {
          key: 'cuotaBase',
          value: newValue,
        },
      );

      Swal.fire('Guardado', 'Monto base actualizado para el próximo mes.', 'success');
    } catch (error) {
      console.error('Error al guardar cuota base:', error);
      Swal.fire('Error', 'No se pudo actualizar el monto base.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePendingCuotas = async () => {
    if (!isUpdateWindow) return;

    const firstConfirm = await Swal.fire({
      title: 'Confirmar actualización',
      text: 'Se actualizarán todas las cuotas pendientes al monto base actual. Esta acción impacta datos existentes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ea268f',
      cancelButtonColor: '#6c757d',
    });

    if (!firstConfirm.isConfirmed) return;

    const secondConfirm = await Swal.fire({
      title: 'Última confirmación',
      text: '¿Seguro que querés ejecutar la actualización de cuotas pendientes ahora?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'No',
      confirmButtonColor: '#ea268f',
      cancelButtonColor: '#6c757d',
    });

    if (!secondConfirm.isConfirmed) return;

    setLoading(true);
    try {
      await client.put('/shares/update-pending');
      await obtenerCuotas();
      Swal.fire('Éxito', 'Cuotas pendientes actualizadas con el nuevo monto base.', 'success');
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'No se pudieron actualizar las cuotas.', 'error');
      console.error('Error al actualizar cuotas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {windowWidth <= 576 && <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />}

      {windowWidth > 576 && <DesktopNavbar logoSrc={logo} />}
      <div className="dashboard-layout">
        <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} activeRoute="/settings" />

        <main className="main-content settings-page">
          {isLoading ? (
            <div className="loading-message">Cargando datos...</div>
          ) : (
            <>
              <section className="settings-grid">
                <article className="settings-card">
                  <h3>Monto Base de Cuota</h3>
                  <p>Este valor se usa para generar las cuotas del próximo período.</p>

                  <div className="input-group-setting">
                      <input
                        id="cuotaBase"
                        type="number"
                        value={cuotaBase}
                        onChange={(e) => setCuotaBase(e.target.value)}
                        className="cuota-input"
                        min="0"
                        placeholder="Ingrese monto"
                        disabled={loading}
                      />
                    <button onClick={handleSaveCuotaBase} disabled={loading} className="action-button save-button">
                      {loading ? 'Guardando...' : 'Guardar monto base'}
                    </button>
                  </div>
                </article>
                <article className="settings-card">
                  <h3>Actualizar Cuotas Pendientes</h3>
                  <p>Actualiza cuotas no pagadas del período actual al monto base configurado.</p>
                  <div className={`status-chip ${isUpdateWindow ? 'ok' : 'blocked'}`}>
                    {isUpdateWindow ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    {isUpdateWindow
                      ? `Disponible hoy (día ${dayOfMonth}). Ventana habilitada del 1 al 10.`
                      : `No disponible hoy (día ${dayOfMonth}). Solo se habilita del 1 al 10.`}
                  </div>
                  <button
                    onClick={handleUpdatePendingCuotas}
                    disabled={loading || !isUpdateWindow}
                    className="action-button update-button"
                    title={isUpdateWindow ? 'Actualizar cuotas pendientes' : 'Fuera de ventana permitida (1-10)'}
                  >
                    {loading ? 'Actualizando...' : 'Actualizar cuotas pendientes'}
                  </button>
                </article>
              </section>
              <section className="info-section">
                <FaInfoCircle className="info-icon" />
                <div className="info-content">
                  <h4>Cómo usar estos ajustes</h4>
                  <ol>
                    <li>Definí el nuevo valor en “Monto base de cuota” y guardalo.</li>
                    <li>Si necesitás ajustar pendientes del mes actual, usá “Actualizar cuotas pendientes” únicamente entre los días 1 y 10.</li>
                    <li>Antes de ejecutar la actualización, el sistema pide doble confirmación para evitar errores.</li>
                  </ol>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Settings;
