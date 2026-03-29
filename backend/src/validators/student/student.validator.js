import { parse, isValid, format } from 'date-fns';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Normalizar fechas (dd/MM/yyyy -> yyyy-MM-dd)
export const normalizeDate = (dateInput) => {
  if (!dateInput) return '';
  const dateStr = String(dateInput).trim();
  let parsedDate;
  const formats = [
    'dd/MM/yyyy', 'd/MM/yyyy', 'dd/M/yyyy', 'd/M/yyyy',
    'dd-MM-yyyy', 'd-MM-yyyy', 'yyyy-MM-dd'
  ];
  
  for (const fmt of formats) {
    parsedDate = parse(dateStr, fmt, new Date());
    if (isValid(parsedDate)) {
       // Validación extra: año razonable
       const year = parsedDate.getFullYear();
       if (year >= 1900 && year <= new Date().getFullYear() + 1) break;
    }
  }
  
  if (!isValid(parsedDate)) return '';
  return format(parsedDate, 'yyyy-MM-dd');
};

// Crear objeto Date UTC
export const createUTCDate = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

// Validador Principal de Datos
export const validateStudentData = (data) => {
    const { name, lastName, dni, birthDate, address, category, mail, guardianName, guardianPhone } = data;
    const errors = [];

    // Campos obligatorios
    const missingFields = [];
    if (!name) missingFields.push('Nombre');
    if (!lastName) missingFields.push('Apellido');
    if (!dni) missingFields.push('DNI');
    if (!birthDate) missingFields.push('Fecha de Nacimiento');
    if (!address) missingFields.push('Dirección');
    if (!category) missingFields.push('Categoría');
    if (!mail) missingFields.push('Email');
    if (!guardianName) missingFields.push('Nombre del Tutor');
    if (!guardianPhone) missingFields.push('Teléfono del Tutor');

    if (missingFields.length > 0) {
        return `Faltan datos obligatorios: ${missingFields.join(', ')}`;
    }

    // Formatos
    if (!/^\d{7,9}$/.test(dni)) return 'El DNI debe contener entre 7 y 9 dígitos';
    if (!/\S+@\S+\.\S+/.test(mail)) return 'Formato de correo electrónico no válido';
    if (!/^\d{10,15}$/.test(guardianPhone)) return 'El teléfono del tutor debe tener entre 10 y 15 dígitos';
    if (String(name).trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (String(lastName).trim().length < 2) return 'El apellido debe tener al menos 2 caracteres';
    if (String(address).trim().length < 5) return 'La dirección debe tener al menos 5 caracteres';
    if (String(guardianName).trim().length < 3) return 'El nombre del tutor debe tener al menos 3 caracteres';

    const normalizedDate = normalizeDate(birthDate);
    if (!normalizedDate) return 'Formato de fecha de nacimiento inválido';

    return null; // Null significa que no hay errores
};
