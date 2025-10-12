import React from 'react';
import { FiCalendar, FiFileText, FiHelpCircle, FiInfo, FiZap } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { FastModeUpload } from '../upload/FastModeUpload';
import { useUploadMode } from '../../hooks/useUploadMode';
import { LessonType } from '../../types';

/**
 * Props for the UploadSection component
 */
interface UploadSectionProps {
  /** Current lesson type selection */
  lessonType: LessonType;
  /** Function to update lesson type */
  setLessonType: (type: LessonType) => void;
  /** Morning CSV file (optional) */
  morningFile: File | null;
  /** Function to set morning file */
  setMorningFile: (file: File) => void;
  /** Afternoon CSV file (optional) */
  afternoonFile: File | null;
  /** Function to set afternoon file */
  setAfternoonFile: (file: File) => void;
  /** Word template file (optional) */
  templateFile: File | null;
  /** Function to set template file */
  setTemplateFile: (file: File) => void;
  /** Course identifier string */
  courseId: string;
  /** Function to update course ID */
  setCourseId: (id: string) => void;
  /** Lesson subject/topic */
  subject: string;
  /** Function to update subject */
  setSubject: (subject: string) => void;
  /** Callback to show template guide modal */
  onShowTemplateGuide: () => void;
  /** Callback to start file processing */
  onProcessFiles: () => void;
  /** Whether files are currently being processed */
  isProcessing: boolean;
}

/**
 * UploadSection Component
 * 
 * Main upload interface for CSV files and lesson configuration.
 * Provides two upload modes:
 * - Manual Mode: Individual file selection with explicit lesson type
 * - Fast Mode: Automatic file detection and assignment
 * 
 * Features:
 * - Upload mode toggle (Manual/Fast)
 * - Lesson type selection (Morning/Afternoon/Both)
 * - Course information input
 * - File upload for CSV and Word template
 * - Validation and processing controls
 */
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

  /**
   * Handles file assignment from fast mode upload
   * Automatically assigns detected files to morning/afternoon slots
   */
  const handleFastModeAssignment = (morning: File, afternoon: File): void => {
    setMorningFile(morning);
    setAfternoonFile(afternoon);
  };

  /**
   * Validates if all required files and inputs are provided for processing
   * 
   * @returns true if processing can proceed, false otherwise
   */
  const canProcess = (): boolean => {
    // Check if required CSV files are uploaded based on lesson type
    const hasRequiredFiles = validateRequiredFiles();
    
    // Ensure template file and subject are provided
    return hasRequiredFiles && templateFile !== null && subject.trim().length > 0;
  };

  /**
   * Validates that required CSV files are uploaded based on lesson type
   */
  const validateRequiredFiles = (): boolean => {
    switch (lessonType) {
      case 'morning':
        return morningFile !== null;
      case 'afternoon':
        return afternoonFile !== null;
      case 'both':
        return morningFile !== null && afternoonFile !== null;
      default:
        return false;
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-section-left">
        {/* Upload Mode Selection */}
        <UploadModeToggle 
          isManualMode={isManualMode}
          onToggleMode={toggleMode}
        />

        {/* Lesson Type Configuration */}
        <LessonTypeSelector 
          lessonType={lessonType}
          onLessonTypeChange={setLessonType}
        />

        {/* Course Information Form */}
        <CourseInfoSection 
          courseId={courseId}
          onCourseIdChange={setCourseId}
          subject={subject}
          onSubjectChange={setSubject}
        />
      </div>

      <div className="upload-section-right">
        {/* CSV File Upload Section */}
        <CSVUploadSection 
          isFastMode={isFastMode}
          lessonType={lessonType}
          morningFile={morningFile}
          afternoonFile={afternoonFile}
          onMorningFileSelect={setMorningFile}
          onAfternoonFileSelect={setAfternoonFile}
          onFastModeAssignment={handleFastModeAssignment}
        />

        {/* Word Template Upload */}
        <TemplateUploadSection 
          templateFile={templateFile}
          onTemplateFileSelect={setTemplateFile}
          onShowTemplateGuide={onShowTemplateGuide}
        />

        {/* Processing Controls */}
        <ProcessingControls 
          canProcess={canProcess()}
          isProcessing={isProcessing}
          onProcessFiles={onProcessFiles}
          lessonType={lessonType}
          morningFile={morningFile}
          afternoonFile={afternoonFile}
          templateFile={templateFile}
          subject={subject}
        />
      </div>
    </div>
  );
};

/**
 * Upload Mode Toggle Component
 */
interface UploadModeToggleProps {
  isManualMode: boolean;
  onToggleMode: () => void;
}

const UploadModeToggle: React.FC<UploadModeToggleProps> = ({ isManualMode, onToggleMode }) => (
  <div className="section-card">
    <div className="section-header">
      <FiZap className="section-icon" />
      <h3>Modalità Caricamento</h3>
    </div>
    <div className="upload-mode-toggle split">
      <button
        onClick={() => { if (!isManualMode) onToggleMode(); }}
        className={`mode-toggle manual${isManualMode ? ' selected' : ''}`}
        aria-pressed={isManualMode}
      >
        <FiFileText />
        <span>Modalità Classica</span>
        <div className="mode-explanation">
          <strong>Controllo Manuale Completo</strong>
          <ul className="mode-features">
            <li>Selezione individuale dei file</li>
            <li>Controllo preciso di ogni upload</li>
            <li>Maggiore flessibilità</li>
            <li>Per utenti esperti</li>
          </ul>
        </div>
      </button>
      <button
        onClick={() => { if (isManualMode) onToggleMode(); }}
        className={`mode-toggle fast${!isManualMode ? ' selected' : ''}`}
        aria-pressed={!isManualMode}
      >
        <FiZap />
        <span>🚀 Modalità Veloce</span>
        <div className="mode-explanation">
          <strong>Caricamento Automatico e Intelligente</strong>
          <ul className="mode-features">
            <li>Riconoscimento automatico dei file</li>
            <li>Assegnazione intelligente mattina/pomeriggio</li>
            <li>Processo semplificato in un click</li>
            <li>Perfetto per principianti</li>
          </ul>
        </div>
      </button>
    </div>
  </div>
);

/**
 * Lesson Type Selector Component
 */
interface LessonTypeSelectorProps {
  lessonType: LessonType;
  onLessonTypeChange: (type: LessonType) => void;
}

const LessonTypeSelector: React.FC<LessonTypeSelectorProps> = ({ lessonType, onLessonTypeChange }) => (
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
          onChange={(e) => onLessonTypeChange(e.target.value as LessonType)}
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
          onChange={(e) => onLessonTypeChange(e.target.value as LessonType)}
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
          onChange={(e) => onLessonTypeChange(e.target.value as LessonType)}
        />
        <div className="radio-content">
          <span className="radio-title">Giornata Completa</span>
          <span className="radio-description">Lezione mattina e pomeriggio</span>
        </div>
      </label>
    </div>
  </div>
);

/**
 * Course Information Section Component
 */
interface CourseInfoSectionProps {
  courseId: string;
  onCourseIdChange: (id: string) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
}

const CourseInfoSection: React.FC<CourseInfoSectionProps> = ({
  courseId,
  onCourseIdChange,
  subject,
  onSubjectChange
}) => (
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
        onChange={(e) => onCourseIdChange(e.target.value)}
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
        onChange={(e) => onSubjectChange(e.target.value)}
        placeholder="es. Matematica, Italiano, Storia..."
        required
      />
      <small>Nome della materia o argomento della lezione</small>
    </div>
  </div>
);

/**
 * CSV Upload Section Component
 */
interface CSVUploadSectionProps {
  isFastMode: boolean;
  lessonType: LessonType;
  morningFile: File | null;
  afternoonFile: File | null;
  onMorningFileSelect: (file: File) => void;
  onAfternoonFileSelect: (file: File) => void;
  onFastModeAssignment: (morning: File, afternoon: File) => void;
}

const CSVUploadSection: React.FC<CSVUploadSectionProps> = ({
  isFastMode,
  lessonType,
  morningFile,
  afternoonFile,
  onMorningFileSelect,
  onAfternoonFileSelect,
  onFastModeAssignment
}) => {
  if (isFastMode) {
    return (
      <div className="section-card">
        <div className="section-header">
          <FiZap className="section-icon" />
          <h3>Caricamento Veloce</h3>
        </div>
        <FastModeUpload onFilesAssigned={onFastModeAssignment} />
      </div>
    );
  }

  return (
    <div className="file-uploads">
      {/* Morning File Upload */}
      {lessonType !== 'afternoon' && (
        <div className="section-card">
          <div className="section-header">
            <FiFileText className="section-icon" />
            <h3>File CSV Mattina</h3>
          </div>
          <FileUpload
            accept=".csv"
            onFileSelect={onMorningFileSelect}
            selectedFile={morningFile || undefined}
            label="Seleziona file CSV della mattina"
            icon={<FiCalendar size={24} />}
          />
        </div>
      )}

      {/* Afternoon File Upload */}
      {lessonType !== 'morning' && (
        <div className="section-card">
          <div className="section-header">
            <FiFileText className="section-icon" />
            <h3>File CSV Pomeriggio</h3>
          </div>
          <FileUpload
            accept=".csv"
            onFileSelect={onAfternoonFileSelect}
            selectedFile={afternoonFile || undefined}
            label="Seleziona file CSV del pomeriggio"
            icon={<FiCalendar size={24} />}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Template Upload Section Component
 */
interface TemplateUploadSectionProps {
  templateFile: File | null;
  onTemplateFileSelect: (file: File) => void;
  onShowTemplateGuide: () => void;
}

const TemplateUploadSection: React.FC<TemplateUploadSectionProps> = ({
  templateFile,
  onTemplateFileSelect,
  onShowTemplateGuide
}) => (
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
      onFileSelect={onTemplateFileSelect}
      selectedFile={templateFile || undefined}
      label="Seleziona template Word (.docx)"
    />
  </div>
);

/**
 * Processing Controls Component
 */
interface ProcessingControlsProps {
  canProcess: boolean;
  isProcessing: boolean;
  onProcessFiles: () => void;
  lessonType: LessonType;
  morningFile: File | null;
  afternoonFile: File | null;
  templateFile: File | null;
  subject: string;
}

const ProcessingControls: React.FC<ProcessingControlsProps> = ({
  canProcess,
  isProcessing,
  onProcessFiles,
  lessonType,
  morningFile,
  afternoonFile,
  templateFile,
  subject
}) => (
  <>
    <button
      onClick={onProcessFiles}
      disabled={!canProcess || isProcessing}
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

    {!canProcess && (
      <RequirementsInfo 
        lessonType={lessonType}
        morningFile={morningFile}
        afternoonFile={afternoonFile}
        templateFile={templateFile}
        subject={subject}
      />
    )}
  </>
);

/**
 * Requirements Info Component
 */
interface RequirementsInfoProps {
  lessonType: LessonType;
  morningFile: File | null;
  afternoonFile: File | null;
  templateFile: File | null;
  subject: string;
}

const RequirementsInfo: React.FC<RequirementsInfoProps> = ({
  lessonType,
  morningFile,
  afternoonFile,
  templateFile,
  subject
}) => (
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
);
