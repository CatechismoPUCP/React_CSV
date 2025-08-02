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
  const [analysisResult, setAnalysisResult] = useState<{
    morningFile: File | null;
    afternoonFile: File | null;
    errors: string[];
  } | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setSelectedFiles(files);
    setAnalysisResult(null);
    
    if (files.length >= 1) {
      setIsProcessing(true);
      
      try {
        // Use the automatic detection logic
        const result = await autoAssignCSVFiles(files);
        setAnalysisResult(result);
        
        // If we have both files or at least one file, proceed with assignment
        if (result.morningFile || result.afternoonFile) {
          onFilesAssigned(
            result.morningFile || new File([], 'empty.csv'), 
            result.afternoonFile || new File([], 'empty.csv')
          );
        }
      } catch (error) {
        console.error('Errore nell\'analisi automatica:', error);
        setAnalysisResult({
          morningFile: null,
          afternoonFile: null,
          errors: ['Errore nell\'analisi automatica dei file']
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="fast-mode-upload">
      <div className="fast-mode-header">
        <FiZap className="fast-icon" />
        <div className="fast-mode-description">
          <h4>Caricamento Automatico</h4>
          <p>Carica i file CSV di Zoom. L'app analizzerà automaticamente gli orari delle sessioni e li assegnerà a mattina (prima delle 13:00) e pomeriggio (dopo le 13:00).</p>
        </div>
      </div>

      <div className="fast-instructions">
        <h5>Come funziona:</h5>
        <ol>
          <li>Seleziona o trascina <strong>uno o più file CSV</strong> di Zoom</li>
          <li>L'app analizzerà automaticamente gli orari delle sessioni</li>
          <li>I file verranno assegnati automaticamente a mattina (prima delle 13:00) e pomeriggio (dopo le 13:00)</li>
          <li>Potrai procedere direttamente alla generazione del documento</li>
        </ol>
      </div>

      <FileUpload
        accept=".csv"
        multiple={true}
        onFileSelect={handleFilesSelected}
        label="Trascina qui i file CSV di Zoom"
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
          
          {analysisResult && (
            <div className="analysis-results">
              {analysisResult.morningFile && (
                <div className="assignment-info">
                  <FiCheckCircle className="success-icon" />
                  <span><strong>Mattina:</strong> {analysisResult.morningFile.name}</span>
                </div>
              )}
              {analysisResult.afternoonFile && (
                <div className="assignment-info">
                  <FiCheckCircle className="success-icon" />
                  <span><strong>Pomeriggio:</strong> {analysisResult.afternoonFile.name}</span>
                </div>
              )}
              {analysisResult.errors.length > 0 && (
                <div className="assignment-warnings">
                  {analysisResult.errors.map((error, index) => (
                    <div key={index} className="assignment-warning">
                      <FiAlertCircle className="warning-icon" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
              {!analysisResult.morningFile && !analysisResult.afternoonFile && (
                <div className="assignment-warning">
                  <FiAlertCircle className="warning-icon" />
                  <span>Impossibile determinare automaticamente il periodo dei file. Verifica che i file CSV contengano dati validi di Zoom.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
