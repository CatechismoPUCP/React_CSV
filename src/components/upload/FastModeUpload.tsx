import React, { useState } from 'react';
import { FiZap, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { autoAssignCSVFiles } from '../../utils/csvParser';

interface FastModeUploadProps {
  onFilesAssigned: (morningFile: File, afternoonFile: File) => void;
}

export const FastModeUpload: React.FC<FastModeUploadProps> = ({ onFilesAssigned }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string>('');
  const [assignmentWarnings, setAssignmentWarnings] = useState<string[]>([]);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setAssignmentMessage('');
    setAssignmentWarnings([]);

    // Analyze and auto-assign by content so order doesn't matter
    if (files.length === 2) {
      setIsProcessing(true);
      autoAssignCSVFiles(files)
        .then(({ morningFile, afternoonFile, errors }) => {
          const warns = errors || [];
          setAssignmentWarnings(warns);

          if (morningFile && afternoonFile) {
            setAssignmentMessage(`Assegnazione completata: ${morningFile.name} → Mattina, ${afternoonFile.name} → Pomeriggio`);
            onFilesAssigned(morningFile, afternoonFile);
          } else if (morningFile || afternoonFile) {
            const which = morningFile ? 'mattina' : 'pomeriggio';
            const fname = (morningFile || afternoonFile)!.name;
            setAssignmentMessage(`Rilevato solo ${which}: ${fname}. Carica anche l'altro file.`);
          } else {
            setAssignmentMessage('Impossibile determinare mattina/pomeriggio dai file. Controlla i CSV.');
          }
          setIsProcessing(false);
        })
        .catch(() => {
          setAssignmentMessage('Errore durante l\'analisi dei file.');
          setIsProcessing(false);
        });
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
            {selectedFiles.map((file: File, index: number) => (
              <div key={index} className="file-item">
                <FiCheckCircle className="success-icon" />
                <span className="file-name">{file.name}</span>
                <span className="file-size">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
          {selectedFiles.length === 2 && assignmentMessage && (
            <div className="assignment-info">
              <FiCheckCircle className="success-icon" />
              <span>{assignmentMessage}</span>
            </div>
          )}
          {selectedFiles.length !== 2 && (
            <div className="assignment-warning">
              <FiAlertCircle className="warning-icon" />
              <span>Seleziona esattamente 2 file CSV per l'assegnazione automatica</span>
            </div>
          )}
          {assignmentWarnings.length > 0 && (
            <div className="assignment-warning">
              <FiAlertCircle className="warning-icon" />
              <div>
                {assignmentWarnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
