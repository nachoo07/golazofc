import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'react-bootstrap';
import { LoginContext } from '../../context/login/LoginContext';
import { FaTimesCircle, FaWifi, FaEye, FaEyeSlash } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import './login.css';
import logo from '../../assets/logo.png';

const Login = () => {
    const { login, auth, isOffline } = useContext(LoginContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (auth) {
            navigate(auth === 'admin' ? '/' : '/homeuser');
        }
    }, [auth, navigate]);

    useEffect(() => {
        const storedAuthError = sessionStorage.getItem('auth_error_message');
        if (storedAuthError) {
            setError(storedAuthError);
            sessionStorage.removeItem('auth_error_message');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanEmail = email.trim();

        // 1. Validaciones Frontend (¡Muy bien hecho!)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            setError('Por favor, ingresa un correo electrónico válido.');
            return;
        }

        if (password.length < 8) { // Coincide con tu validación de backend recomendada
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        // 2. Lógica de Login
        setIsLoading(true); // Bloqueamos botón
        try {
            // CORRECCIÓN CRÍTICA: Pasamos los argumentos separados, no como objeto.
            // Y usamos 'cleanEmail' para enviar el dato limpio.
            await login(cleanEmail, password);

            // No hace falta navegar aquí explícitamente, el useEffect o el Context lo manejan,
            // pero si quisieras forzarlo, iría aquí.
        } catch (err) {
            // El Context ya procesó el error y nos devuelve un mensaje limpio en err.message
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false); // Desbloqueamos botón (si falló)
        }
    };

    const CustomAlert = ({ type, message, icon }) => (
        <div className={`login-alert login-alert-${type}`} role="alert">
            <span className="login-alert-icon">{icon}</span>
            <span className="login-alert-message">{message}</span>
        </div>
    );
    return (
        <div className="login-page-container">
            <div className="login-page-form-wrapper">
                <div className="login-page-logo-container">
                    <img src={logo} alt="Logo" className="login-page-logo" />
                </div>
                <div className="login-page-title-container">
                    <h2 className="login-page-title">Bienvenido</h2>
                </div>
                <Form onSubmit={handleSubmit} className="login-page-form">
                    <Form.Group className="login-page-form-input" controlId="emailInput">
                        <Form.Label className="login-page-form-label">Correo Electrónico</Form.Label>
                        <Form.Control
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading || isOffline}
                        />
                    </Form.Group>
                    <Form.Group className="login-page-form-input" controlId="passwordInput">
                        <Form.Label className="login-page-form-label">Contraseña</Form.Label>
                        <div className="login-password-wrapper mb-3">
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading || isOffline}
                            />
                            <button
                                type="button"
                                className="login-password-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                disabled={isLoading || isOffline}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </Form.Group>
                    {error && (
                        <CustomAlert
                            type="error"
                            message={error}
                            icon={<FaTimesCircle />}
                        />
                    )}
                    {isOffline && (
                        <CustomAlert
                            type="warning"
                            message="Sin conexión. Verifica tu internet."
                            icon={<FaWifi />}
                        />
                    )}
                    <div className="login-page-button-container">
                        <Button
                            variant="primary"
                            type="submit"
                            className="login-page-submit-button"
                            disabled={isLoading || isOffline}
                        >
                            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                        </Button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default Login;
