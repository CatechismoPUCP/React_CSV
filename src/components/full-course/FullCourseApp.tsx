import React, { useState, useEffect, useCallback } from 'react';
import { FullCourseCSVUpload } from './FullCourseUpload/FullCourseCSVUpload';
import { AliasManager } from './AliasManager/AliasManager';
import { FullCourseParticipantEditor } from './FullCourseParticipantEditor';
import { ParsedFullCourseData, BatchDocumentResult } from '../../types/course';
import { fullCourseDocumentGenerator } from '../../services/fullCourseDocumentGenerator';
import { FiArrowLeft, FiLoader, FiCheckCircle, FiAlertCircle, FiDownload } from 'react-icons/fi';

interface FullCourseAppProps {
  templateFile: File | null;
  onBackToMenu: () => void;
}

type CourseAppStep = 'csv-upload' | 'alias-management' | 'participant-editor' | 'document-generation';

export const FullCourseApp: React.FC<FullCourseAppProps> = ({ templateFile, onBackToMenu }) => {
  const [currentStep, setCurrentStep] = useState<CourseAppStep>('csv-upload');
  const [parsedCSVData, setParsedCSVData] = useState<ParsedFullCourseData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0, date: '' });
  const [generateResult, setGenerateResult] = useState<BatchDocumentResult | null>(null);
  const [generateError, setGenerateError] = useState('');
  const [showAddAbsentModal, setShowAddAbsentModal] = useState(false);
  const [absentName, setAbsentName] = useState('');
  const [absentEmail, setAbsentEmail] = useState('');
  const [participantLimitError, setParticipantLimitError] = useState('');

  const handleGenerateDocuments = useCallback(async () => {
    if (!templateFile || !parsedCSVData) {
      setGenerateError('Template o dati CSV mancanti');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const result = await fullCourseDocumentGenerator.generateAllDocuments(
        parsedCSVData,
        templateFile,
        (current, total, date) => {
          setGenerateProgress({ current, total, date });
        }
      );

      setGenerateResult(result);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Errore durante la generazione');
    } finally {
      setIsGenerating(false);
    }
  }, [templateFile, parsedCSVData]);

  // Auto-generate documents when entering document-generation step
  useEffect(() => {
    if (currentStep === 'document-generation' && parsedCSVData && templateFile && !isGenerating && !generateResult) {
      handleGenerateDocuments();
    }
  }, [currentStep, parsedCSVData, templateFile, isGenerating, generateResult, handleGenerateDocuments]);

  const handleDownloadZIP = () => {
    if (generateResult?.zipData && generateResult?.zipFilename) {
      const url = URL.createObjectURL(generateResult.zipData);
      const link = document.createElement('a');
      link.href = url;
      link.download = generateResult.zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleCSVParsed = (data: ParsedFullCourseData) => {
    setParsedCSVData(data);
    // Go to alias management if there are suggestions, otherwise skip to participant editor
    if (data.aliasSuggestions.length > 0) {
      setCurrentStep('alias-management');
    } else {
      setCurrentStep('participant-editor');
    }
  };

  const handleAliasManagementComplete = (updatedData: ParsedFullCourseData) => {
    setParsedCSVData(updatedData);
    setCurrentStep('participant-editor');
  };

  const handleAliasManagementBack = () => {
    setCurrentStep('csv-upload');
  };

  const handleParticipantEditorComplete = (updatedData: ParsedFullCourseData) => {
    setParsedCSVData(updatedData);
    setCurrentStep('document-generation');
  };

  const handleParticipantEditorBack = () => {
    // Go back to alias management if there were suggestions, otherwise to CSV upload
    if (parsedCSVData && parsedCSVData.aliasSuggestions.length > 0) {
      setCurrentStep('alias-management');
    } else {
      setCurrentStep('csv-upload');
    }
  };

  const handleDocumentGenerationComplete = () => {
    // Reset and go back to menu after successful generation
    onBackToMenu();
  };

  const handleBackToStart = () => {
    setCurrentStep('csv-upload');
    setParsedCSVData(null);
    setGenerateResult(null);
    setGenerateError('');
  };

  const openAliasManager = () => {
    if (!parsedCSVData) return;
    setCurrentStep('alias-management');
  };

  const openAddAbsentModal = () => {
    setShowAddAbsentModal(true);
    setAbsentName('');
    setAbsentEmail('');
  };

  const addFixedAbsent = () => {
    if (!parsedCSVData) return;
    const name = absentName.trim();
    const email = absentEmail.trim();
    if (!name) return;
    const newParticipant = {
      id: `manual_${name.toLowerCase().replace(/\s+/g,'_')}_${Date.now()}`,
      primaryName: name,
      aliases: [name],
      email,
      isOrganizer: false,
      masterOrder: parsedCSVData.allParticipants.length + 1,
      daysPresent: [],
    };
    const prospectiveList = [...parsedCSVData.allParticipants, newParticipant];
    const nonOrganizerCount = prospectiveList.filter(p => !p.isOrganizer).length;
    if (nonOrganizerCount > 5) {
      setParticipantLimitError('Limite massimo di 5 partecipanti (escluso l\'organizzatore)');
      return;
    }
    const updated: ParsedFullCourseData = {
      ...parsedCSVData,
      allParticipants: prospectiveList,
      statistics: {
        ...parsedCSVData.statistics,
        totalParticipants: parsedCSVData.statistics.totalParticipants + 1,
      },
    };
    setParsedCSVData(updated);
    setShowAddAbsentModal(false);
    setParticipantLimitError('');
  };

  return (
    <div className="full-course-app">
      <div className="full-course-header">
        <button onClick={onBackToMenu} className="btn btn-back">
          <FiArrowLeft /> Torna al Menu
        </button>
        <h1>Modalità Corso Completo</h1>
        {parsedCSVData && (
          <div className="actions-bar">
            {currentStep !== 'participant-editor' && (
              <button className="btn btn-secondary" onClick={openAliasManager}>Gestisci Alias</button>
            )}
            <button className="btn btn-primary" onClick={openAddAbsentModal}>Aggiungi Assente Fisso</button>
          </div>
        )}
      </div>
      {participantLimitError && (
        <div className="limit-error-banner">
          <FiAlertCircle /> {participantLimitError}
        </div>
      )}

      {currentStep === 'csv-upload' && (
        <FullCourseCSVUpload
          onParsed={handleCSVParsed}
          onCancel={onBackToMenu}
          autoProceed
        />
      )}

      {currentStep === 'alias-management' && parsedCSVData && (
        <AliasManager
          parsedData={parsedCSVData}
          onComplete={handleAliasManagementComplete}
          onBack={handleAliasManagementBack}
        />
      )}

      {currentStep === 'participant-editor' && parsedCSVData && (
        <FullCourseParticipantEditor
          parsedData={parsedCSVData}
          onComplete={handleParticipantEditorComplete}
          onBack={handleParticipantEditorBack}
        />
      )}

      {currentStep === 'document-generation' && (
        <div className="document-generation-view">
          <div className="generation-container">
            {!templateFile ? (
              <div className="template-warning">
                <FiAlertCircle size={48} color="#ffc107" />
                <h2>Template Mancante</h2>
                <p>Carica prima un template dalla modalità "Giorno Singolo"</p>
                <button onClick={handleBackToStart} className="btn btn-secondary">
                  <FiArrowLeft /> Indietro
                </button>
              </div>
            ) : isGenerating ? (
              <div className="generating-status">
                <FiLoader className="spinner" size={48} />
                <h2>Generazione Documenti in Corso...</h2>
                <div className="progress-info">
                  <p>Documento {generateProgress.current} di {generateProgress.total}</p>
                  <p className="progress-date">{generateProgress.date}</p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(generateProgress.current / generateProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : generateResult ? (
              <div className="generation-complete">
                <FiCheckCircle size={48} color="#28a745" />
                <h2>Generazione Completata!</h2>
                <div className="result-stats">
                  <div className="stat-card success">
                    <div className="stat-value">{generateResult.totalGenerated}</div>
                    <div className="stat-label">Documenti Generati</div>
                  </div>
                  {generateResult.totalFailed > 0 && (
                    <div className="stat-card danger">
                      <div className="stat-value">{generateResult.totalFailed}</div>
                      <div className="stat-label">Errori</div>
                    </div>
                  )}
                </div>
                {generateResult.zipFilename && (
                  <button onClick={handleDownloadZIP} className="btn btn-primary btn-large">
                    <FiDownload /> Scarica ZIP - {generateResult.zipFilename}
                  </button>
                )}
                <button onClick={handleDocumentGenerationComplete} className="btn btn-secondary">
                  Continua al Dashboard
                </button>
              </div>
            ) : generateError ? (
              <div className="generation-error">
                <FiAlertCircle size={48} color="#dc3545" />
                <h2>Errore</h2>
                <p>{generateError}</p>
                <button onClick={handleBackToStart} className="btn btn-secondary">
                  <FiArrowLeft /> Indietro
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {showAddAbsentModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Aggiungi Assente Fisso</h3>
            <div className="modal-row">
              <input
                type="text"
                placeholder="Nome"
                value={absentName}
                onChange={(e) => setAbsentName(e.target.value)}
              />
            </div>
            <div className="modal-row">
              <input
                type="email"
                placeholder="Email (opzionale)"
                value={absentEmail}
                onChange={(e) => setAbsentEmail(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddAbsentModal(false)}>Annulla</button>
              <button className="btn btn-primary" onClick={addFixedAbsent} disabled={!absentName.trim()}>Aggiungi</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .full-course-app {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .full-course-header {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: white;
          border-bottom: 1px solid #e9ecef;
        }

        .full-course-header h1 {
          margin: 0;
          color: #212529;
          font-size: 1.8rem;
        }

        .spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        .actions-bar {
          margin-left: auto;
          display: flex;
          gap: 10px;
        }

        .limit-error-banner {
          margin: 0 20px 10px 20px;
          padding: 10px 12px;
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 420px;
          max-width: 90vw;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .modal-row { margin: 10px 0; }
        .modal-row input { width: 100%; padding: 8px; border: 1px solid #dee2e6; border-radius: 6px; }
        .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background-color 0.2s;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-large {
          padding: 12px 24px;
          font-size: 1rem;
        }

        .btn-back {
          background: #6c757d;
          color: white;
        }

        .btn-back:hover {
          background: #545b62;
        }

        .document-generation-view {
          min-height: 100vh;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .generation-container {
          max-width: 600px;
          width: 100%;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 40px;
          text-align: center;
        }

        .template-warning,
        .generating-status,
        .generation-complete,
        .generation-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .generation-container h2 {
          margin: 0;
          color: #212529;
          font-size: 1.5rem;
        }

        .generation-container p {
          margin: 0;
          color: #6c757d;
        }

        .progress-info {
          width: 100%;
        }

        .progress-date {
          font-size: 0.9rem;
          color: #495057;
          margin-top: 5px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 15px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #28a745);
          transition: width 0.3s ease;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          width: 100%;
          margin: 20px 0;
        }

        .stat-card {
          padding: 20px;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .stat-card.success {
          background: #d4edda;
          color: #155724;
        }

        .stat-card.danger {
          background: #f8d7da;
          color: #721c24;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 0.9rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .course-list-view {
            padding: 15px;
          }

          .course-list-header {
            flex-direction: column;
            gap: 15px;
            align-items: stretch;
          }

          .courses-grid {
            grid-template-columns: 1fr;
          }

          .course-card {
            padding: 15px;
          }

          .course-header {
            flex-direction: column;
            gap: 10px;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};
