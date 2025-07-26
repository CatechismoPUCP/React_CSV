import React from 'react';
import { FiX, FiInfo, FiCode } from 'react-icons/fi';

interface TemplateGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateGuide: React.FC<TemplateGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const placeholders = [
    { name: '{{day}}', description: 'Giorno del mese (es. 08)' },
    { name: '{{month}}', description: 'Mese (es. 07)' },
    { name: '{{year}}', description: 'Anno (es. 2025)' },
    { name: '{{orariolezione}}', description: 'Orario della lezione (es. 09:00-13:00)' },
    { name: '{{argomento}}', description: 'Argomento della lezione' },
    { name: '{{nome1}} - {{nome5}}', description: 'Nomi dei partecipanti (fino a 5)' },
    { name: '{{MattOraIn1}} - {{MattOraIn5}}', description: 'Orari ingresso mattina' },
    { name: '{{MattOraOut1}} - {{MattOraOut5}}', description: 'Orari uscita mattina' },
    { name: '{{PomeOraIn1}} - {{PomeOraIn5}}', description: 'Orari ingresso pomeriggio' },
    { name: '{{PomeOraOut1}} - {{PomeOraOut5}}', description: 'Orari uscita pomeriggio' },
    { name: '{{presenza1}} - {{presenza5}}', description: 'Stato presenza (Presente/Assente)' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content template-guide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FiInfo className="icon" />
            <h3>Guida Template Word</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="guide-section">
            <h4><FiCode className="icon" /> Placeholder Disponibili</h4>
            <p className="guide-description">
              Utilizza questi placeholder nel tuo template Word. Verranno sostituiti automaticamente con i dati reali:
            </p>
            
            <div className="placeholder-list">
              {placeholders.map((placeholder, index) => (
                <div key={index} className="placeholder-item">
                  <code className="placeholder-code">{placeholder.name}</code>
                  <span className="placeholder-description">{placeholder.description}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="guide-section">
            <h4>📝 Esempio di utilizzo</h4>
            <div className="example-box">
              <p><strong>Data:</strong> {'{{day}}/{{month}}/{{year}}'}</p>
              <p><strong>Orario:</strong> {'{{orariolezione}}'}</p>
              <p><strong>Argomento:</strong> {'{{argomento}}'}</p>
              <p><strong>Partecipante 1:</strong> {'{{nome1}} - {{presenza1}}'}</p>
              <p><strong>Ingresso Mattina:</strong> {'{{MattOraIn1}}'}</p>
            </div>
          </div>
          
          <div className="guide-section">
            <h4>⚠️ Note Importanti</h4>
            <ul className="guide-notes">
              <li>I placeholder devono essere racchiusi tra doppie parentesi graffe: <code>{'{{placeholder}}'}</code></li>
              <li>Rispetta esattamente la scrittura dei placeholder (case-sensitive)</li>
              <li>I partecipanti sono numerati da 1 a 5 (massimo 5 partecipanti per template)</li>
              <li>Solo l'orario di inizio lezione viene arrotondato all'ora spaccata più vicina</li>
              <li>Gli orari individuali di ingresso/uscita dei partecipanti rimangono esatti</li>
            </ul>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
};
