import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4005;
export const CONNECTION_STRING = process.env.CONNECTION_STRING
//mensaje de prueba