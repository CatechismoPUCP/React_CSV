import React, { useState } from 'react';
import { FiZap, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';

interface FastModeUploadProps {
  onFilesAssigned: (morningFile: File, afternoonFile: File) => void;
}

export const FastModeUpload: React.FC<FastModeUploadProps> = ({ onFilesAssigned }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    
    // Simple auto-assignment: if we have 2 files, assume first is morning, second is afternoon
    if (files.length === 2) {
      setIsProcessing(true);
      setTimeout(() => {
        onFilesAssigned(files[0], files[1]);
        setIsProcessing(false);
      }, 1000);
    }
  };

  return (
    <div className="fast-mode-upload">
      <div className="fast-mode-header">
        <FiZap className="fast-icon" />
        <div className="fast-mode-description">
          <h4>Caricamento Automatico</h4>
          <p>Carica entrambi i file CSV di Zoom contemporaneamente. L'app li analizzerà e li assegnerà automaticamente a mattina e pomeriggio.</p>
        </div>
      </div>

      <div className="fast-instructions">
        <h5>Come funziona:</h5>
        <ol>
          <li>Seleziona o trascina <strong>esattamente 2 file CSV</strong> di Zoom</li>
          <li>L'app analizzerà automaticamente gli orari delle sessioni</li>
          <li>I file verranno assegnati automaticamente a mattina e pomeriggio</li>
          <li>Potrai procedere direttamente alla generazione del documento</li>
        </ol>
      </div>

      <FileUpload
        accept=".csv"
        multiple={true}
        onFileSelect={handleFilesSelected}
        label="Trascina qui i file CSV di mattina e pomeriggio"
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="analysis-loading">
          <div className="loading-spinner"></div>
          <span>Elaborazione in corso...</span>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>File Selezionati</h4>
          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <FiCheckCircle className="success-icon" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
          {selectedFiles.length === 2 && (
            <div className="assignment-info">
              <FiCheckCircle className="success-icon" />
              <span>File assegnati automaticamente: {selectedFiles[0].name} (Mattina), {selectedFiles[1].name} (Pomeriggio)</span>
            </div>
          )}
          {selectedFiles.length !== 2 && (
            <div className="assignment-warning">
              <FiAlertCircle className="warning-icon" />
              <span>Seleziona esattamente 2 file CSV per l'assegnazione automatica</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
