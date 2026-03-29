import express from 'express';
import { PORT, NODE_ENV, FRONTEND_ORIGINS } from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db/db.connection.js';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user/user.routes.js';
import authRoutes from './routes/login/login.routes.js';
import studentRoutes from './routes/student/student.router.js';
import shareRoutes from './routes/share/share.router.js';
import attendanceRoutes from './routes/attendance/attendance.routes.js';
import motionRoutes from './routes/motion/motion.router.js';
import configRoutes from './routes/base/config.routes.js';
import paymentRoutes from './routes/payment/payment.route.js';
import emailRoutes from './routes/email/email.routes.js';
import { errorHandler } from './middlewares/user/user.middlewares.js';
import { AppError } from './utils/errors/appError.js';
import './cron/cronjob/cronShare.js';
import pino from 'pino';
import { verifyTransporter, isEmailConfigured } from './services/email/transporter.service.js';

const logger = pino();

const app = express();
app.set('trust proxy', NODE_ENV === 'production' ? 1 : 0);

const allowedOrigins = NODE_ENV === 'production'
  ? FRONTEND_ORIGINS
  : ['http://localhost:5173', 'http://localhost:4005'];

app.use(helmet());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError('Origen no permitido por CORS', 403));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(cookieParser());

const stateChangingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
app.use((req, _res, next) => {
  if (!stateChangingMethods.has(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  if (!origin) {
if (NODE_ENV !== 'production') {
  return next();
}
    return next(new AppError('Origen no permitido por CSRF', 403));
  }

  if (allowedOrigins.includes(origin)) {
    return next();
  }

  return next(new AppError('Origen no permitido por CSRF', 403));
});

// NUEVO: Middleware para timeouts en requests (30 segundos max)
app.use((req, res, next) => {
  req.setTimeout(30000); // Timeout para la request
  res.setTimeout(30000); // Timeout para la response
  next();
});

// Rate limit específico para auth
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: (req) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    return {
      success: false,
      message: `Demasiados intentos. Por favor, intenta de nuevo en ${retryAfter} segundos.`
    };
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: NODE_ENV === 'production' ? 120 : 500,
  message: async (req) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    return `Demasiados intentos. Por favor, intenta de nuevo en ${retryAfter} segundos.`;
  },
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/students', apiLimiter, studentRoutes);
app.use('/api/shares', apiLimiter, shareRoutes);
app.use('/api/attendance', apiLimiter, attendanceRoutes);
app.use('/api/motions', apiLimiter, motionRoutes);
app.use('/api/config', apiLimiter, configRoutes);
app.use('/api/email', apiLimiter, emailRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);

app.use((req, _res, next) => {
  next(new AppError('Ruta no encontrada', 404));
});

// Manejo de errores
app.use(errorHandler);

const bootstrap = async () => {
  try {
    logger.info('Iniciando backend');
    logger.info({ port: PORT }, 'Conectando a MongoDB antes de levantar el servidor');
    await connectDB();
    const server = app.listen(PORT, () => {
      logger.info({ port: PORT }, 'La aplicación está escuchando');

      if (isEmailConfigured()) {
        void verifyTransporter();
      }
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.fatal({ port: PORT }, 'No se pudo iniciar la aplicación: el puerto ya está en uso');
      } else {
        logger.fatal({ error: error.message }, 'No se pudo iniciar la aplicación al abrir el puerto');
      }

      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error: error.message }, 'No se pudo iniciar la aplicación');
    process.exit(1);
  }
};

bootstrap();

