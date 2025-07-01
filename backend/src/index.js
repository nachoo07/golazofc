import express from 'express';
import { PORT } from './config/config.js';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import './db/db.connection.js';
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
import './cron/cronjob/cronShare.js';
import pino from 'pino';

const logger = pino();

const app = express();
// Configura trust proxy para confiar en 1 proxy (Nginx en producción)
app.set('trust proxy', 1); // Cambia de 'true' a 1

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://golazoescueladefutbol.com', 'https://www.golazoescueladefutbol.com']
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
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));
app.use(cookieParser());

// Configura rateLimit con trustProxy explícito
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 10 : 50, // 10 en producción, 50 en desarrollo
  message: async (req) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    return `Demasiados intentos. Por favor, intenta de nuevo en ${retryAfter} segundos.`;
  },
  trustProxy: process.env.NODE_ENV === 'production' ? 1 : 0 // Confía en 1 proxy en producción, 0 en desarrollo
});

app.use('/api/auth/login', limiter);

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/motions', motionRoutes);
app.use('/api/config', configRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/payments', paymentRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Manejo de errores
app.use(errorHandler);

// Servidor escuchando
app.listen(PORT, () => {
  logger.info(`La aplicación está escuchando el puerto ${PORT}`);
});

