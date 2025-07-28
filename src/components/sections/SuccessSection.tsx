import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

interface SuccessSectionProps {
  onNewDocument: () => void;
}

export const SuccessSection: React.FC<SuccessSectionProps> = ({
  onNewDocument,
}) => {
  return (
    <div className="success-section">
      <div className="success-message">
        <FiCheckCircle size={48} />
        <h3>Registro Generato con Successo!</h3>
        <p>Il file Word è stato scaricato automaticamente.</p>
      </div>

      <button className="new-document-button" onClick={onNewDocument}>
        Genera Nuovo Registro
      </button>
    </div>
  );
};
