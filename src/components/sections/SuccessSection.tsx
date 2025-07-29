import React from 'react';
import { FiCheckCircle, FiHome, FiRefreshCw } from 'react-icons/fi';

interface SuccessSectionProps {
  onNewDocument: () => void;
  onReturnToDashboard: () => void;
}

export const SuccessSection: React.FC<SuccessSectionProps> = ({
  onNewDocument,
  onReturnToDashboard,
}) => {
  return (
    <div className="success-section">
      <div className="success-message">
        <FiCheckCircle size={48} />
        <h3>Registro Generato con Successo!</h3>
        <p>Il file Word è stato scaricato automaticamente.</p>
      </div>

      <div className="success-actions">
        <button className="return-dashboard-button" onClick={onReturnToDashboard}>
          <FiHome className="icon" />
          Torna alla Dashboard
        </button>
        <button className="new-document-button" onClick={onNewDocument}>
          <FiRefreshCw className="icon" />
          Genera Nuovo Registro
        </button>
      </div>
    </div>
  );
};
