import React, { useEffect } from 'react';
import { BiError } from "react-icons/bi";
import { BiCheck } from "react-icons/bi";
import './alertCustom.css';

const AlertCustom = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  // Título predeterminado según el tipo
  let title = type === 'success' ? 'Éxito...' : 'Error...';
  let bodyMessage = message;
  
  // Si el mensaje ya contiene un salto de línea, usamos la primera parte como título
  if (message.includes('\n')) {
    const parts = message.split('\n');
    title = parts[0];
    bodyMessage = parts.slice(1).join('\n');
  }

  return (
    <div className={`alert-custom ${type === 'success' ? 'alert-success' : 'alert-error'}`}>
      <div className="alert-icon-container">
        {type === 'success' ? 
          <BiCheck size={24} /> : 
          <BiError size={24} />
        }
      </div>
      <div className="alert-content">
        <h3 className="alert-title">{title}</h3>
        {bodyMessage && <p className="alert-message">{bodyMessage}</p>}
      </div>
      <div className="alert-progress"></div>
    </div>
  );
};

export default AlertCustom;