import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino()

export const protect = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token Expirado' });
        }
        logger.error({ error: error.message }, 'Error al verificar el token');
        return res.status(401).json({ message: 'Token Invalido' });
      }
};

export const admin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: You are not an admin' });
    }
    next();
  };