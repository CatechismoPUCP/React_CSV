import React from 'react';
import { FiCalendar, FiFileText, FiHelpCircle, FiInfo, FiZap } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { FastModeUpload } from '../upload/FastModeUpload';
import { useUploadMode } from '../../hooks/useUploadMode';
import { LessonType } from '../../types';

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
  const { toggleMode, isManualMode, isFastMode } = useUploadMode();

  const handleFastModeAssignment = (morning: File, afternoon: File) => {
    setMorningFile(morning);
    setAfternoonFile(afternoon);
  };

  const canProcess = () => {
    const hasRequiredFiles = (lessonType === 'morning' && morningFile) ||
                           (lessonType === 'afternoon' && afternoonFile) ||
                           (lessonType === 'both' && morningFile && afternoonFile);
    
    return hasRequiredFiles && templateFile && subject.trim();
  };

  return (
    <div className="upload-section">
      {/* Upload Mode Toggle */}
      <div className="section-card">
        <div className="section-header">
          <FiZap className="section-icon" />
          <h3>Modalità Caricamento</h3>
        </div>
        <div className="upload-mode-toggle">
          <button
            onClick={toggleMode}
            className={`mode-toggle ${isManualMode ? 'manual' : 'fast'}`}
          >
            {isManualMode ? (
              <>
                <FiFileText />
                <span>Modalità Manuale</span>
                <small>Carica file singolarmente</small>
              </>
            ) : (
              <>
                <FiZap />
                <span>Modalità Veloce</span>
                <small>Carica e assegna automaticamente</small>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lesson Type Selection */}
      <div className="section-card">
        <div className="section-header">
          <FiCalendar className="section-icon" />
          <h3>Tipo di Lezione</h3>
        </div>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="lessonType"
              value="morning"
              checked={lessonType === 'morning'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <div className="radio-content">
              <span className="radio-title">Solo Mattina</span>
              <span className="radio-description">Lezione solo al mattino</span>
            </div>
          </label>
          <label>
            <input
              type="radio"
              name="lessonType"
              value="afternoon"
              checked={lessonType === 'afternoon'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <div className="radio-content">
              <span className="radio-title">Solo Pomeriggio</span>
              <span className="radio-description">Lezione solo al pomeriggio</span>
            </div>
          </label>
          <label>
            <input
              type="radio"
              name="lessonType"
              value="both"
              checked={lessonType === 'both'}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
            />
            <div className="radio-content">
              <span className="radio-title">Giornata Completa</span>
              <span className="radio-description">Lezione mattina e pomeriggio</span>
            </div>
          </label>
        </div>
      </div>

      {/* Course Information */}
      <div className="section-card">
        <div className="section-header">
          <FiInfo className="section-icon" />
          <h3>Informazioni Corso</h3>
        </div>
        <div className="input-group">
          <label htmlFor="courseId">ID Corso</label>
          <input
            id="courseId"
            type="text"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="es. CORSO_001"
          />
          <small>Identificativo univoco del corso (opzionale)</small>
        </div>
        <div className="input-group">
          <label htmlFor="subject">Materia <span className="required">*</span></label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="es. Matematica, Italiano, Storia..."
            required
          />
          <small>Nome della materia o argomento della lezione</small>
        </div>
      </div>

      {/* File Uploads */}
      {isFastMode ? (
        <div className="section-card">
          <div className="section-header">
            <FiZap className="section-icon" />
            <h3>Caricamento Veloce</h3>
          </div>
          <FastModeUpload onFilesAssigned={handleFastModeAssignment} />
        </div>
      ) : (
        <div className="file-uploads">
          {/* Morning File */}
          {lessonType !== 'afternoon' && (
            <div className="section-card">
              <div className="section-header">
                <FiFileText className="section-icon" />
                <h3>File CSV Mattina</h3>
              </div>
              <FileUpload
                accept=".csv"
                onFileSelect={setMorningFile}
                selectedFile={morningFile || undefined}
                label="Seleziona file CSV della mattina"
                icon={<FiCalendar size={24} />}
              />
            </div>
          )}

          {/* Afternoon File */}
          {lessonType !== 'morning' && (
            <div className="section-card">
              <div className="section-header">
                <FiFileText className="section-icon" />
                <h3>File CSV Pomeriggio</h3>
              </div>
              <FileUpload
                accept=".csv"
                onFileSelect={setAfternoonFile}
                selectedFile={afternoonFile || undefined}
                label="Seleziona file CSV del pomeriggio"
                icon={<FiCalendar size={24} />}
              />
            </div>
          )}
        </div>
      )}

      {/* Template File - Always shown */}
      <div className="section-card">
        <div className="section-header">
          <FiFileText className="section-icon" />
          <h3>Template Word</h3>
          <button
            onClick={onShowTemplateGuide}
            className="help-button"
            title="Guida al template"
          >
            <FiHelpCircle />
          </button>
        </div>
        <FileUpload
          accept=".docx"
          onFileSelect={setTemplateFile}
          selectedFile={templateFile || undefined}
          label="Seleziona template Word (.docx)"
        />
      </div>

      {/* Process Button */}
      <button
        onClick={onProcessFiles}
        disabled={!canProcess() || isProcessing}
        className="process-button"
      >
        {isProcessing ? (
          <>
            <div className="loading-spinner"></div>
            <span>Elaborazione in corso...</span>
          </>
        ) : (
          <>
            <FiZap />
            <span>Elabora File</span>
          </>
        )}
      </button>

      {!canProcess() && (
        <div className="requirements-info">
          <p>Per procedere è necessario:</p>
          <ul>
            {!subject.trim() && <li>Inserire la materia</li>}
            {lessonType === 'morning' && !morningFile && <li>Caricare il file CSV della mattina</li>}
            {lessonType === 'afternoon' && !afternoonFile && <li>Caricare il file CSV del pomeriggio</li>}
            {lessonType === 'both' && !morningFile && <li>Caricare il file CSV della mattina</li>}
            {lessonType === 'both' && !afternoonFile && <li>Caricare il file CSV del pomeriggio</li>}
            {!templateFile && <li>Caricare il template Word</li>}
          </ul>
        </div>
      )}
    </div>
  );
};
