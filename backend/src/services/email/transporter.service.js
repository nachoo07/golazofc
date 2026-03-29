import nodemailer from "nodemailer";
import pino from "pino";
import dotenv from "dotenv";

dotenv.config();

const logger = pino();
const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
let transporterVerified = false;
let verifyInFlight = false;

if (!emailConfigured) {
  logger.warn("Servicio de email deshabilitado: faltan EMAIL_USER o EMAIL_PASS");
}

export const transporter = emailConfigured
  ? nodemailer.createTransport({
      service: "gmail",
      pool: true,
      maxConnections: 10,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

export const verifyTransporter = async () => {
  if (!transporter || transporterVerified || verifyInFlight) return;

  verifyInFlight = true;
 
  try {
    await transporter.verify();
    transporterVerified = true;
    logger.info("Transporter verificado exitosamente");
  } catch (error) {
    logger.error({ error: error.message }, "Error al verificar el transporter de nodemailer");
  } finally {
    verifyInFlight = false;
  }
};

export const isEmailConfigured = () => emailConfigured;

export const buildFromAddress = () => `"Golazo" <${process.env.EMAIL_USER || "no-reply@yoclaudio.local"}>`;
