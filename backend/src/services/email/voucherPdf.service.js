import PDFDocument from "pdfkit/js/pdfkit.js";
import path from "path";
import { fileURLToPath } from "url";
import { DateTime } from "luxon";
import fs from "fs";
import pino from "pino";
import Counter from "../../models/base/counter.model.js";

const logger = pino();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, "../../assets/logo.png");
let logoBuffer = null;

if (fs.existsSync(logoPath)) {
  try {
    logoBuffer = fs.readFileSync(logoPath);
  } catch (error) {
    logger.error({ error: error.message }, "Error al cargar el logo en memoria");
  }
}

const formatCache = new Map();

const formatAmount = (amount) => {
  if (amount === undefined || amount === null || amount === "") return "N/A";

  const cacheKey = `amount_${amount}`;
  if (formatCache.has(cacheKey)) return formatCache.get(cacheKey);

  if (typeof amount === "number" && Number.isFinite(amount)) {
    const formattedNumber = `$${amount.toLocaleString("es-AR")}`;
    formatCache.set(cacheKey, formattedNumber);
    return formattedNumber;
  }

  const sanitizedAmount = String(amount)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!sanitizedAmount) return "N/A";

  let normalizedNumeric = sanitizedAmount;

  if (sanitizedAmount.includes(",")) {
    normalizedNumeric = sanitizedAmount.replace(/\./g, "").replace(",", ".");
  } else if (sanitizedAmount.includes(".")) {
    const dotParts = sanitizedAmount.split(".");
    if (dotParts.length > 2) {
      normalizedNumeric = sanitizedAmount.replace(/\./g, "");
    } else {
      const [left, right] = dotParts;
      normalizedNumeric = right && right.length === 3 ? `${left}${right}` : sanitizedAmount;
    }
  }

  const numAmount = Number(normalizedNumeric);

  if (isNaN(numAmount)) return "N/A";

  const formatted = `$${numAmount.toLocaleString("es-AR")}`;
  formatCache.set(cacheKey, formatted);
  return formatted;
};

const capitalizeFirstLetter = (text) => {
  if (!text) return "N/A";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const normalizeDni = (value) => {
  if (!value) return "N/A";
  const onlyDigits = String(value).replace(/\D/g, "");
  if (!onlyDigits) return "N/A";
  return onlyDigits;
};

const formatDni = (value) => {
  const dni = normalizeDni(value);
  if (dni === "N/A") return dni;
  return Number(dni).toLocaleString("es-AR");
};

const formatDate = (date) => {
  if (!date) return "N/A";

  const cacheKey = `date_${date}`;
  if (formatCache.has(cacheKey)) return formatCache.get(cacheKey);

  let parsedDate;

  if (typeof date === "string" && date.includes("T")) {
    parsedDate = DateTime.fromISO(date, { zone: "utc" });
  } else if (typeof date === "string" && date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    parsedDate = DateTime.fromFormat(date, "dd/MM/yyyy", { zone: "America/Argentina/Tucuman" });
  } else if (date instanceof Date) {
    parsedDate = DateTime.fromJSDate(date, { zone: "America/Argentina/Tucuman" });
  } else {
    parsedDate = DateTime.fromJSDate(new Date(date), { zone: "America/Argentina/Tucuman" });
  }

  if (!parsedDate.isValid) return "N/A";

  const formatted = parsedDate.toFormat("dd/MM/yyyy");
  formatCache.set(cacheKey, formatted);
  return formatted;
};

const getPaymentDate = (attachment) => (
  attachment?.cuota?.paymentdate ||
  attachment?.payment?.paymentDate ||
  null
);

const getNextVoucherNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: "voucher_number" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return String(counter.seq).padStart(6, "0");
};

const safeText = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  return String(value);
};

const getVoucherDetail = (attachment) => {
  if (attachment?.cuota) {
    return {
      sectionTitle: "Detalle del Pago",
      concept: "Cuota mensual",
      period: safeText(attachment.cuota.date),
      method: safeText(attachment.cuota.paymentmethod),
      amount: formatAmount(attachment.cuota.amount),
    };
  }

  return {
    sectionTitle: "Detalle del Pago",
    concept: capitalizeFirstLetter(attachment?.payment?.concept),
    period: formatDate(attachment?.payment?.paymentDate),
    method: safeText(attachment?.payment?.paymentMethod),
    amount: formatAmount(attachment?.payment?.amount),
  };
};

export const generateVoucherPdf = async (attachment) => {
  // Fecha/hora de emisión del comprobante.
  const issuedAt = DateTime.now().setZone("America/Argentina/Tucuman");
  // Fecha de pago a mostrar en cabecera.
  const paymentDate = formatDate(getPaymentDate(attachment));
  // Número secuencial 000001, 000002, ...
  const voucherNumber = await getNextVoucherNumber();
  // Datos que alimentan la fila de "Detalle del Pago".
  const detail = getVoucherDetail(attachment);
  // Valor de "Nombre y Apellido".
  const studentName = `${safeText(attachment?.student?.name)} ${safeText(attachment?.student?.lastName)}`.replace(/\s+/g, " ").trim();
  // Valor de DNI formateado con puntos.
  const studentDni = formatDni(attachment?.student?.dni);

  const doc = new PDFDocument({
    // Tamaño total del PDF (ANCHO, ALTO). Si agrandás esto, agrandás el lienzo.
    size: [1000, 600],
    // Sin márgenes automáticos de PDFKit.
    margin: 0,
    // Fuente base.
    font: "Helvetica",
    // Compresión del PDF (menos peso de archivo).
    compress: true,
    pdfVersion: "1.5",
  });

  // Base de diseño para escalar posiciones/fuentes.
  const BASE_WIDTH = 1000;
  const BASE_HEIGHT = 600;
  // Escala horizontal y vertical.
  const scaleX = doc.page.width / BASE_WIDTH;
  const scaleY = doc.page.height / BASE_HEIGHT;
  // Escala usada para tipografías.
  const scaleFont = Math.min(scaleX, scaleY);
  // Helpers: x(...) y y(...) para coordenadas, fsz(...) para tamaño de fuente.
  const x = (value) => value * scaleX;
  const y = (value) => value * scaleY;
  const fsz = (value) => Math.max(8, Math.round(value * scaleFont));

  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  let logoAdded = false;

  if (logoBuffer) {
    try {
      // Logo real: X, Y y ancho. Para agrandar logo, subí width.
      doc.image(logoBuffer, x(22), y(44), { width: x(152) });
      logger.info("Logo agregado desde caché al PDF");
      logoAdded = true;
    } catch (error) {
      logger.error({ error: error.message }, "Error al agregar el logo desde caché al PDF");
    }
  } else if (fs.existsSync(logoPath)) {
    try {
      // Fallback por path de archivo.
      doc.image(logoPath, x(22), y(44), { width: x(152) });
      logger.info("Logo agregado exitosamente al PDF desde archivo");
      logoAdded = true;
    } catch (error) {
      logger.error({ error: error.message }, "Error al agregar el logo al PDF");
    }
  } else {
    logger.warn(`Archivo de logo no encontrado en: ${logoPath}`);
  }

  // Franja rosa superior (X, Y, ancho, alto).
  doc.rect(0, y(24), doc.page.width, y(9)).fill("#e31fa8");

  if (!logoAdded) {
    // Placeholder si no carga el logo.
    doc.circle(x(94), y(98), x(56)).fill("#ffe4f2");
    doc.fillColor("#e31fa8").font("Helvetica-Bold").fontSize(fsz(28)).text("YC", x(74), y(86));
  }

  // Título principal (texto, X, Y). El tamaño lo controla fsz(46).
  doc.fillColor("#1f2937").font("Helvetica-Bold").fontSize(fsz(46)).text("Comprobante de Pago", x(188), y(72));
  // Subtítulo de marca.
  doc.fillColor("#6b7280").font("Helvetica").fontSize(fsz(18)).text("Golazo · Escuela de Futbol", x(188), y(126));

  // Caja de "N° Comprobante" (X, Y, ancho, alto, radio).
  doc.roundedRect(x(744), y(70), x(210), y(98), x(10)).fillAndStroke("#fff2fa", "#f6bfdc");
  // Label de la caja.
  doc.fillColor("#a21a87").font("Helvetica").fontSize(fsz(10)).text("N° Comprobante", x(760), y(84));
  // Número 000001 (tamaño controlado por fsz(18)).
  doc.fillColor("#e31fa8").font("Helvetica-Bold").fontSize(fsz(18)).text(voucherNumber, x(760), y(100), { width: x(198) });
  // Fecha de pago dentro de la caja.
  doc.fillColor("#6b7280").font("Helvetica").fontSize(fsz(11)).text(`Pago: ${paymentDate}`, x(760), y(128));
  // Fecha de emisión dentro de la caja.
  doc.fillColor("#6b7280").font("Helvetica").fontSize(fsz(11)).text(`Emision: ${issuedAt.toFormat("dd/MM/yyyy")}`, x(760), y(142));

  // Línea divisoria horizontal entre cabecera y bloque alumno.
  doc.moveTo(0, y(222)).lineTo(doc.page.width, y(222)).lineWidth(Math.max(1, x(1.3))).strokeColor("#e5e7eb").stroke();

  // Título de sección "Datos del Alumno" (solo título).
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(19)).text("Datos del Alumno", x(18), y(244));
  // Fondo del bloque de alumno.
  doc.roundedRect(0, y(270), doc.page.width, y(78), 0).fillAndStroke("#f9fafb", "#e5e7eb");
  // Label "Nombre y Apellido:" (NO el valor).
  doc.fillColor("#374151").font("Helvetica").fontSize(fsz(16)).text("Nombre y Apellido:", x(28), y(294), { width: x(150) });
  // Valor del nombre/apellido (sí el valor).
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(studentName, x(182), y(294), { width: x(760) });
  // Label "DNI:" (NO el valor).
  doc.fillColor("#374151").font("Helvetica").fontSize(fsz(16)).text("Dni:", x(28), y(318), { width: x(150) });
  // Valor DNI (sí el valor).
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(studentDni, x(182), y(318), { width: x(260) });

  // Título de sección "Detalle del Pago" (solo título).
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(19)).text(detail.sectionTitle, x(18), y(370));
  // Fondo del bloque de detalle.
  doc.roundedRect(0, y(396), doc.page.width, y(124), 0).fillAndStroke("#f9fafb", "#e5e7eb");

  // Y inicial del encabezado de columnas.
  const headerY = y(420);
  // Encabezados de columnas (Concepto, Periodo, Método, Monto).
  doc.fillColor("#374151").font("Helvetica").fontSize(fsz(16)).text("Concepto", x(28), headerY);
  doc.text("Periodo", x(360), headerY);
  doc.text("Método", x(620), headerY);
  doc.text("Monto", x(860), headerY);
  // Línea divisoria entre encabezado y fila de valores.
  doc.moveTo(x(28), y(438)).lineTo(x(972), y(438)).lineWidth(Math.max(1, x(1))).strokeColor("#e5e7eb").stroke();

  // Y de la fila de datos.
  const rowY = y(462);
  // Valores de la fila (concepto/periodo/método/monto).
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(detail.concept, x(28), rowY, { width: x(320) });
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(detail.period, x(360), rowY, { width: x(230) });
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(detail.method, x(620), rowY, { width: x(220) });
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(fsz(15)).text(detail.amount, x(860), rowY);

  doc.end();

  return await new Promise((resolve, reject) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on("error", reject);
  });
};
