import { useState, useContext, useEffect } from "react";
import { Button } from "react-bootstrap";
import { FaFileInvoice, FaSpinner } from "react-icons/fa";
import { EmailContext } from "../../context/email/EmailContext";
import "./SendVoucherEmail.css";

const SendVoucherEmail = ({ student, cuota, onSendingStart, onSendingEnd, onStudentUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const { sendVoucherEmail } = useContext(EmailContext);

  useEffect(() => {
    if (student && cuota && cuota.paymentdate && cuota.paymentmethod) {
      setIsDataReady(true);
    } else {
      setIsDataReady(false);
    }
  }, [student, cuota]);

  const formatDateWithTimezone = (date) => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) return 'N/A';
    return parsedDate.toLocaleDateString('es-ES', {
      timeZone: 'America/Argentina/Tucuman',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCuil = (dni) => {
    if (!dni) return "N/A";
    const cleanCuil = dni.replace(/\D/g, "");
    if (cleanCuil.length === 11) {
      return `${cleanCuil.substring(0, 2)}-${cleanCuil.substring(2, 10)}-${cleanCuil.substring(10)}`;
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
          dni: formatCuil(student.dni),
        },
        cuota: {
          date: cuota.date
            ? new Date(cuota.date).toLocaleString('es-ES', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Tucuman' }).replace(/^\w/, (c) => c.toUpperCase())
            : 'N/A',
          amount: cuota.amount
            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(cuota.amount)
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
        className={`send-voucher ${cuota.state !== "Pagado" ? "disabled" : ""}`}
        onClick={handleSendVoucher}
        disabled={loading || !isDataReady || cuota.state !== "Pagado"}
        title={cuota.state === "Pagado" ? "Enviar comprobante" : "Cuota no pagada"}
      >
        {!loading && <FaFileInvoice className={cuota.state !== "Pagado" ? "disabled-icon" : ""} />}
        {loading && <FaSpinner className="spinner" />}
      </Button>
    </>
  );
};

export default SendVoucherEmail;