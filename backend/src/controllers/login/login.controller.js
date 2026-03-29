import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from "../../models/users/user.model.js";
import RefreshToken from '../../models/refreshToken/refreshToken.model.js';
import pino from 'pino';
import { validationResult } from 'express-validator';
import {
    sendBadRequest,
    sendForbidden,
    sendInternalServerError,
    sendUnauthorized
} from '../_shared/controller.utils.js';

const logger = pino();
const INVALID_CREDENTIALS_MESSAGE = 'Credenciales inválidas';

const buildCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/'
});

const clearAuthCookies = (res) => {
    const cookieOptions = buildCookieOptions();
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
};

const handleValidationErrors = (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
    }
    return null;
};

// Generar Access Token
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
};

// Generar Refresh Token
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Login
export const loginUser = async (req, res) => {
    const validationError = handleValidationErrors(req, res);
    if (validationError) return validationError;

    const mail = typeof req.body?.mail === 'string' ? req.body.mail.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!mail || !password) {
        return sendBadRequest(res, 'Mail y contraseña son requeridos');
    }
    try {
        const user = await User.findOne({ mail }).select('+password');
        if (!user || !await bcrypt.compare(password, user.password)) {
            logger.warn({ mail }, 'Intento de login fallido');
            return sendUnauthorized(res, INVALID_CREDENTIALS_MESSAGE);
        }
        if (!user.state) {
            logger.warn({ mail }, 'Intento de login en cuenta inactiva');
            return sendUnauthorized(res, INVALID_CREDENTIALS_MESSAGE);
        }

        user.lastLogin = new Date();
        await user.save();

        const payload = {
            userId: user._id,
            role: user.role,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Almacenar el RefreshToken en la base de datos
        await RefreshToken.create({
            tokenHash: hashRefreshToken(refreshToken),
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        res.cookie('token', accessToken, {
            ...buildCookieOptions(),
            maxAge: 2 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', refreshToken, {
            ...buildCookieOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        logger.info({ userId: user._id }, 'Login exitoso');
        res.status(200).json({
            message: 'Login exitoso',
            user: { id: user._id, name: user.name, role: user.role, mail: user.mail }
        });
    } catch (error) {
        logger.error({ error: error.message, mail }, 'Error en login');
        return sendInternalServerError(res, 'Error interno del servidor al iniciar sesión.');
    }
};

// Logout
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const refreshTokenHash = hashRefreshToken(refreshToken);
            await RefreshToken.deleteOne({
                tokenHash: refreshTokenHash
            });

        }
        clearAuthCookies(res);
        logger.info('Usuario deslogueado correctamente');
        res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
        logger.error({ error: error.message }, 'Error durante el logout');
        clearAuthCookies(res);
        res.status(500).json({ message: 'Sesión cerrada' });
    }
};

// Refresh Token
export const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return sendUnauthorized(res, 'No autenticado')
    }

    try {
        const refreshTokenHash = hashRefreshToken(refreshToken);
        const storedToken = await RefreshToken.findOne({
            tokenHash: refreshTokenHash
        });

        if (!storedToken) {
            const decoded = jwt.decode(refreshToken);
            logger.warn({ userId: decoded?.userId }, 'Alerta de Seguridad: Intento de uso de Refresh Token inválido o reutilizado');
            return sendForbidden(res, 'Sesión inválida, por favor inicie sesión nuevamente');
        }

        if (storedToken.expiresAt < new Date()) {
            await RefreshToken.deleteOne({ _id: storedToken._id });
            return sendForbidden(res, 'Sesión expirada');
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.userId).select('_id role state name mail').lean();
        if (!user || !user.state) {
            await RefreshToken.deleteOne({ _id: storedToken._id });
            clearAuthCookies(res);
            return sendForbidden(res, 'Sesión inválida, por favor inicie sesión nuevamente');
        }

        await RefreshToken.deleteOne({ _id: storedToken._id });

        const payload = {
            userId: String(user._id),
            role: decoded.role,
        };

        const newAccessToken = generateAccessToken(payload);
        const newRefreshToken = generateRefreshToken(payload);

        await RefreshToken.create({
            tokenHash: hashRefreshToken(newRefreshToken),
            userId: decoded.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        res.cookie('token', newAccessToken, {
            ...buildCookieOptions(),
            maxAge: 2 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', newRefreshToken, {
            ...buildCookieOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        logger.info({ userId: decoded.userId }, 'Access token refrescado');
        res.status(200).json({
            message: 'Access token refrescado',
            user: {
                id: String(user._id),
                name: user.name,
                role: user.role,
                mail: user.mail ?? null
            }
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Aquí sí somos específicos porque el frontend necesita saberlo para limpiar estado
            logger.info('Intento de refresh con token expirado');
            // Aseguramos limpieza si existe en BD
            const refreshTokenHash = hashRefreshToken(refreshToken);
            await RefreshToken.deleteOne({
                tokenHash: refreshTokenHash
            }).catch(() => { });

            clearAuthCookies(res);
            return sendForbidden(res, 'Sesión expirada');
        }
        clearAuthCookies(res);
        logger.error({ err: error.message, stack: error.stack }, 'Error procesando refresh token');
        return sendForbidden(res, 'No se pudo renovar la sesión');
    }
};
