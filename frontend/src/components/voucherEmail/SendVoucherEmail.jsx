import { useState, useContext, useEffect } from "react";
import { Button } from "react-bootstrap";
import { FaFileInvoice, FaSpinner } from "react-icons/fa";
import { EmailContext } from "../../context/email/EmailContext";
import "./SendVoucherEmail.css";

const SendVoucherEmail = ({   student,
  cuota,
  onSendingStart = () => {},
  onSendingEnd = () => {},
  onStudentUpdate,
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const { sendVoucherEmail } = useContext(EmailContext);

  useEffect(() => {
    if (student && cuota && cuota.paymentdate && cuota.paymentmethod) {
      setIsDataReady(true);
    } else {
      console.warn("Datos insuficientes para generar el comprobante:", { student, cuota });
      setIsDataReady(false);
    }
  }, [student, cuota]);

  const formatDni = (dni) => {
    if (!dni) return "N/A";
    const cleanDni = dni.replace(/\D/g, "");
    if (cleanDni.length === 8) {
      return `${cleanDni.substring(0, 2)}.${cleanDni.substring(2, 5)}.${cleanDni.substring(5, 8)}`;
    }
    return dni;
  };

  const handleSendVoucher = async () => {
    if (!isDataReady) {
      console.error('Datos no listos para enviar el comprobante.');
      return;
    }

    setLoading(true);
    onSendingStart();
    try {
      console.time('sendVoucherEmail');
      await sendVoucherEmail(student, cuota, {
        content: 'Generar PDF',
        format: 'pdf',
        filename: `Comprobante_${student.name}_${cuota.date ? new Date(cuota.date).toLocaleString('es-ES', { month: 'short', year: 'numeric', timeZone: 'America/Argentina/Tucuman' }) : 'N/A'}.pdf`,
        mimeType: 'application/pdf',
        student: {
          name: student.name || 'N/A',
          lastName: student.lastName || '',
          dni: formatDni(student.dni),
        },
        cuota: {
          date: cuota.date
            ? new Date(cuota.date).toLocaleString('es-ES', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Tucuman' }).replace(/^\w/, (c) => c.toUpperCase())
            : 'N/A',
          amount: cuota.amount !== undefined && cuota.amount !== null
            ? Number(cuota.amount)
            : 'N/A',
          paymentmethod: cuota.paymentmethod || 'N/A',
          paymentdate: cuota.paymentdate,
        },
      });
      console.timeEnd('sendVoucherEmail');
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      if (error.message === 'El estudiante no tiene un correo registrado.') {
        if (onStudentUpdate) onStudentUpdate();
      }
    } finally {
      setLoading(false);
      onSendingEnd();
    }
  };

  return (
    <>
      <Button
        className={`action-btn-student ${cuota.state !== "Pagado" ? "disabled" : ""}`}
        onClick={handleSendVoucher}
        disabled={loading || disabled || !isDataReady || cuota.state !== "Pagado"}
        title={cuota.state === "Pagado" ? "Enviar comprobante" : "Cuota no pagada"}
      >
        {!loading && <FaFileInvoice className={cuota.state !== "Pagado" ? "disabled-icon" : ""} />}
        {loading && <FaSpinner className="spinner" />}
      </Button>
    </>
  );
};

export default SendVoucherEmail;
