import jwt from 'jsonwebtoken';
import pino from 'pino';
import User from '../../models/users/user.model.js';

const logger = pino()

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

const clearAccessCookie = (res) => {
  res.clearCookie('token', buildCookieOptions());
};

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'No autorizado, token no encontrado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('_id role state').lean();
    if (!user) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
    }

    if (!user.state) {
      clearAuthCookies(res);
      return res.status(403).json({ message: 'Su cuenta está inactiva. Contacte al administrador.' });
    }
    req.user = {
      userId: String(user._id),
      role: user.role
    };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      clearAccessCookie(res);
      return res.status(401).json({ message: 'Token Expirado' });
    }
    clearAccessCookie(res);
    logger.warn({ ip: req.ip }, 'Token inválido o manipulado detectado');
    return res.status(401).json({ message: 'Token Inválido' });
  }
};

export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Prohibido: No eres un administrador' });
  }
  next();
};
