import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from "../../models/users/user.model.js";
import RefreshToken from '../../models/refreshToken/refreshToken.model.js';
import pino from 'pino';
const logger = pino();

// Generar Access Token
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });
};

// Generar Refresh Token
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Login
export const loginUser = async (req, res) => {
    const { mail, password } = req.body;

    if (!mail || !password) {
        return res.status(400).json({ message: 'Se requiere correo electrónico y contraseña.' });
    }
    try {
        const user = await User.findOne({ mail }).select('+password');
        if (!user || !await bcrypt.compare(password, user.password)) {
            logger.warn({ mail }, 'Intento de login fallido');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        if (!user.state) {
            return res.status(403).json({ message: 'Su cuenta está inactiva. Por favor contacte al administrador.' });
        }

        user.lastLogin = new Date();
        await user.save();

        const payload = {
            userId: user._id,
            role: user.role,
            name: user.name,
            mail: user.mail,
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        // Almacenar el RefreshToken en la base de datos
        await RefreshToken.create({
            token: refreshToken,
            userId: user._id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        });

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Cambiado de 'lax' a 'strict'
            path: '/',
            maxAge: 2 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Cambiado de 'lax' a 'strict'
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        logger.info({ userId: user._id }, 'Login exitoso');
        res.status(200).json({
            message: 'Login exitoso',
            user: { name: user.name, role: user.role, mail: user.mail }
        });
    } catch (error) {
        logger.error({ error: error.message, mail }, 'Error en login');
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
};

// Logout
export const logout = (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            RefreshToken.deleteOne({ token: refreshToken }).exec(); // Eliminar de la base de datos
            logger.info('Refresh token eliminado durante logout');
        }
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Cambiado de 'strict' a 'lax'
            path: '/'
        });
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Cambiado de 'strict' a 'lax'
            path: '/'
        });
        logger.info('Usuario deslogueado');
        res.status(200).json({ message: 'Usuario deslogueado exitosamente' });
    } catch (error) {
        logger.error({ error: error.message }, 'Error durante el logout');
        res.status(500).json({ message: 'Error durante logout' });
    }
};

// Refresh Token
export const refreshAccessToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token no encontrado, por favor inicie sesión nuevamente' });
    }

    try {
        const storedToken = await RefreshToken.findOne({ token: refreshToken });
        if (!storedToken) {
            logger.warn('Refresh token no válido o revocado');
            return res.status(403).json({ message: 'Refresh token no válido o revocado, por favor inicie sesión nuevamente' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const payload = {
            userId: decoded.userId,
            role: decoded.role,
            name: decoded.name,
            mail: decoded.mail
        };

        const accessToken = generateAccessToken(payload);

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 2 * 60 * 60 * 1000
        });

        logger.info({ userId: decoded.userId }, 'Access token refrescado');
        res.status(200).json({ message: 'Access token refrescado' });
    } catch (error) {
        logger.error({ error: error.message }, 'Error al refrescar token');
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ message: 'Refresh token expirado, por favor inicie sesión nuevamente' });
        }
        return res.status(403).json({ message: 'Refresh token inválido, por favor inicie sesión nuevamente' });
    }
};