import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const requiredEnvs = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'CONNECTION_STRING'];

if (isProduction) {
  requiredEnvs.push('FRONTEND_ORIGINS');
}

requiredEnvs.forEach((envKey) => {
  if (!process.env[envKey]) {
    console.error(`FATAL ERROR: La variable de entorno ${envKey} no está definida.`);
    process.exit(1);
  }
});

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 4005;
export const CONNECTION_STRING = process.env.CONNECTION_STRING;

export const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
