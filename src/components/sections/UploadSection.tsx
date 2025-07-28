import React from 'react';
import { FiCalendar, FiFileText, FiHelpCircle, FiInfo } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { LessonType } from '../../types';
import { FileService } from '../../services/fileService';

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
        </div>
      </div>

      <div className="file-uploads">
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
