import React from 'react';
import { FiFileText, FiHelpCircle } from 'react-icons/fi';
import { FileUpload } from '../FileUpload';
import { LessonType } from '../../types';

interface ManualModeUploadProps {
  lessonType: LessonType;
  morningFile: File | null;
  setMorningFile: (file: File) => void;
  afternoonFile: File | null;
  setAfternoonFile: (file: File) => void;
  templateFile: File | null;
  setTemplateFile: (file: File) => void;
  onShowTemplateGuide: () => void;
}

export const ManualModeUpload: React.FC<ManualModeUploadProps> = ({
  lessonType,
  morningFile,
  setMorningFile,
  afternoonFile,
  setAfternoonFile,
  templateFile,
  setTemplateFile,
  onShowTemplateGuide,
}) => {
  return (
    <div className="manual-mode-upload">
      <div className="upload-grid">
        {/* Morning File Upload */}
        {lessonType !== 'afternoon' && (
          <div className="upload-section">
            <div className="section-header">
              <FiFileText className="section-icon" />
              <h3>File CSV Mattina</h3>
            </div>
            <FileUpload
              accept=".csv"
              onFileSelect={setMorningFile}
              selectedFile={morningFile || undefined}
              label="Seleziona file CSV della mattina"
            />
            {morningFile && (
              <div className="file-info">
                <span className="file-name">{morningFile.name}</span>
                <span className="file-size">
                  {(morningFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </div>
        )}

        {/* Afternoon File Upload */}
        {lessonType !== 'morning' && (
          <div className="upload-section">
            <div className="section-header">
              <FiFileText className="section-icon" />
              <h3>File CSV Pomeriggio</h3>
            </div>
            <FileUpload
              accept=".csv"
              onFileSelect={setAfternoonFile}
              selectedFile={afternoonFile || undefined}
              label="Seleziona file CSV del pomeriggio"
            />
            {afternoonFile && (
              <div className="file-info">
                <span className="file-name">{afternoonFile.name}</span>
                <span className="file-size">
                  {(afternoonFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            )}
          </div>
        )}

        {/* Template File Upload */}
        <div className="upload-section">
          <div className="section-header">
            <FiFileText className="section-icon" />
            <h3>Template Word</h3>
            <button
              onClick={onShowTemplateGuide}
              className="help-btn"
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
          {templateFile && (
            <div className="file-info">
              <span className="file-name">{templateFile.name}</span>
              <span className="file-size">
                {(templateFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
