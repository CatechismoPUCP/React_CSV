import React, { useState } from 'react';
import { FiCalendar, FiFileText, FiHelpCircle, FiInfo, FiZap, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { LessonType, CSVAnalysis } from '../../types';
import { FileService } from '../../services/fileService';
import { autoAssignCSVFiles } from '../../utils/csvParser';

interface UploadSectionProps {
  lessonType: LessonType;
  setLessonType: (type: LessonType) => void;
  morningFile: File | null;
  setMorningFile: (file: File) => void;
  afternoonFile: File | null;
  setAfternoonFile: (file: File) => void;
  templateFile: File | null;
  setTemplateFile: (file: File) => void;
  courseId: string;
  setCourseId: (id: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  onShowTemplateGuide: () => void;
  onProcessFiles: () => void;
  isProcessing: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  lessonType,
  setLessonType,
  morningFile,
  setMorningFile,
  afternoonFile,
  setAfternoonFile,
  templateFile,
  setTemplateFile,
  courseId,
  setCourseId,
  subject,
  setSubject,
  onShowTemplateGuide,
  onProcessFiles,
  isProcessing,
}) => {
  const [fastModeFiles, setFastModeFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Array<{ file: File; analysis: CSVAnalysis }>>([]);
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFastModeFiles = async (files: File[]) => {
    setFastModeFiles(files);
    setIsAnalyzing(true);
    setAnalysisErrors([]);
    
    try {
      const result = await autoAssignCSVFiles(files);
      
      // Auto-assign the detected files
      if (result.morningFile) {
        setMorningFile(result.morningFile);
      }
      if (result.afternoonFile) {
        setAfternoonFile(result.afternoonFile);
      }
      
      setAnalysisResults(result.analyses);
      setAnalysisErrors(result.errors);
      
      // Auto-switch to 'both' mode if we have both files
      if (result.morningFile && result.afternoonFile) {
        setLessonType('both');
      } else if (result.morningFile) {
        setLessonType('morning');
      } else if (result.afternoonFile) {
        setLessonType('afternoon');
      }
    } catch (error) {
      setAnalysisErrors([`Errore nell'analisi automatica: ${error}`]);
    } finally {
      setIsAnalyzing(false);
    }
  };
  return (
    <div className="upload-section">
      <div className="lesson-type-selector">
        <h3>Tipo di Lezione</h3>
        <div className="info-box">
          <FiInfo className="icon" />
          <p>
            <strong>Esempio:</strong> Solo l'orario di <strong>inizio lezione</strong> viene arrotondato all'ora spaccata più vicina. 
            Se la prima persona entra alle 09:15, l'orario di inizio sarà mostrato come 09:00. Gli orari individuali di ingresso/uscita rimangono esatti.
          </p>
        </div>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="morning"
              checked={lessonType === 'morning'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <span>Solo Mattina (09:00-13:00)</span>
          </label>
          <label>
            <input
              type="radio"
              value="afternoon"
              checked={lessonType === 'afternoon'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <span>Solo Pomeriggio (14:00-18:00)</span>
          </label>
          <label>
            <input
              type="radio"
              value="both"
              checked={lessonType === 'both'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <span>Entrambi (09:00-13:00 / 14:00-18:00)</span>
          </label>
          <label>
            <input
              type="radio"
              value="fast"
              checked={lessonType === 'fast'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <span><FiZap className="inline-icon" /> Modalità Fast (Auto-riconoscimento)</span>
          </label>
        </div>
      </div>

      <div className="file-uploads">
        {lessonType === 'fast' ? (
          <div className="fast-mode-section">
            <div className="fast-mode-info">
              <FiZap className="icon" />
              <div>
                <h4>Modalità Fast - Auto-riconoscimento</h4>
                <p>Carica 1 o 2 file CSV e il sistema determinerà automaticamente se sono della mattina o del pomeriggio basandosi sull'orario di inizio (discriminante: 13:00).</p>
              </div>
            </div>
            
            <div className="fast-upload">
              <input
                type="file"
                id="fast-csv-files"
                accept=".csv"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleFastModeFiles(files);
                  }
                }}
                style={{ display: 'none' }}
              />
              <label htmlFor="fast-csv-files" className="fast-upload-button">
                <FiZap size={24} />
                <span>Seleziona File CSV (1-2 file)</span>
              </label>
            </div>

            {isAnalyzing && (
              <div className="analysis-status">
                <div className="loading-spinner"></div>
                <span>Analizzando i file...</span>
              </div>
            )}

            {analysisResults.length > 0 && (
              <div className="analysis-results">
                <h4>Risultati Analisi:</h4>
                {analysisResults.map((result, index) => (
                  <div key={index} className={`analysis-item ${result.analysis.period}`}>
                    <div className="analysis-icon">
                      {result.analysis.period === 'morning' && <FiCheckCircle className="morning-icon" />}
                      {result.analysis.period === 'afternoon' && <FiCheckCircle className="afternoon-icon" />}
                      {result.analysis.period === 'unknown' && <FiAlertCircle className="unknown-icon" />}
                    </div>
                    <div className="analysis-details">
                      <strong>{result.file.name}</strong>
                      <span className="period-label">
                        {result.analysis.period === 'morning' && 'Mattina'}
                        {result.analysis.period === 'afternoon' && 'Pomeriggio'}
                        {result.analysis.period === 'unknown' && 'Non riconosciuto'}
                      </span>
                      <small>
                        Primo ingresso: {result.analysis.firstJoinTime.toLocaleTimeString('it-IT')} | 
                        Partecipanti: {result.analysis.participantCount}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analysisErrors.length > 0 && (
              <div className="analysis-errors">
                <h4>Avvisi:</h4>
                {analysisErrors.map((error, index) => (
                  <div key={index} className="error-item">
                    <FiAlertCircle className="error-icon" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {(lessonType === 'morning' || lessonType === 'both') && (
              <FileUpload
                label="File CSV Mattina"
                accept=".csv"
                onFileSelect={setMorningFile}
                selectedFile={morningFile || undefined}
                icon={<FiCalendar size={24} />}
                required
              />
            )}

            {(lessonType === 'afternoon' || lessonType === 'both') && (
              <FileUpload
                label="File CSV Pomeriggio"
                accept=".csv"
                onFileSelect={setAfternoonFile}
                selectedFile={afternoonFile || undefined}
                icon={<FiCalendar size={24} />}
                required
              />
            )}
          </>
        )}

        <div className="template-section">
          <div className="template-header">
            <FileUpload
              label="Template Word (.docx)"
              accept=".docx"
              onFileSelect={setTemplateFile}
              selectedFile={templateFile || undefined}
              icon={<FiFileText size={24} />}
              required
            />
            <button 
              type="button" 
              className="help-button"
              onClick={onShowTemplateGuide}
              title="Guida Template"
            >
              <FiHelpCircle size={20} />
              Guida Template
            </button>
          </div>
          <div className="template-info">
            <p>
              <strong>Percorso standard:</strong> 
              <code>{FileService.generateTemplateFilename(courseId)}</code>
            </p>
          </div>
        </div>
      </div>

      <div className="form-inputs">
        <div className="input-group">
          <label htmlFor="courseId">
            ID Corso (facoltativo)
          </label>
          <input
            id="courseId"
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="Es: AI2024 (se vuoto, non verrà incluso nel nome file)"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="subject">
            Argomento della Lezione <span className="required">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Es: AI: Intelligenza Artificiale"
            required
          />
        </div>
      </div>

      <button
        className="process-button"
        onClick={onProcessFiles}
        disabled={isProcessing}
      >
        {isProcessing ? 'Elaborazione...' : 'Elabora File CSV'}
      </button>
    </div>
  );
};
