import cloudinary from 'cloudinary';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ level: 'info' });
const cloudinaryV2 = cloudinary.v2;

// Configuración
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extraer ID público de una URL
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return `students/${fileName.split('.')[0]}`;
  } catch (error) {
    return '';
  }
};

// Descargar imagen desde URL externa
export const downloadImage = async (url) => {
  try {
    // Soporte para Google Drive
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/[-\w]{25,}/);
      if (!fileId) throw new Error('URL de Google Drive inválida');
      url = `https://drive.google.com/uc?export=download&id=${fileId[0]}`;
    }
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    const mimeType = response.headers['content-type'];
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      throw new Error('Formato de imagen no válido (solo jpg/png)');
    }
    return { buffer: Buffer.from(response.data), mimetype: mimeType };
  } catch (error) {
    throw error;
  }
};

// Subir a Cloudinary
export const uploadToCloudinary = async (file, folder, publicId) => {
  try {
    const result = await cloudinaryV2.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      { folder, public_id: publicId, resource_type: 'image', overwrite: true }
    );
    return result.secure_url;
  } catch (error) {
    logger.error(`Error Cloudinary: ${error.message}`);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
};

// Eliminar de Cloudinary
export const deleteFromCloudinary = async (publicId) => {
    try {
        if (publicId) await cloudinaryV2.uploader.destroy(publicId);
    } catch (error) {
        logger.error(`Error eliminando imagen: ${error.message}`);
    }
};

// Generar Firma (Para el Frontend)
export const getCloudinarySignature = () => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'students' },
      process.env.CLOUDINARY_API_SECRET
    );
    return {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY
    };
};