import React, { useState, useEffect, useCallback } from 'react';
import { CourseSetup } from './CourseSetup/CourseSetup';
import { CourseDashboard } from './CourseDashboard/CourseDashboard';
import { FullCourseCSVUpload } from './FullCourseUpload/FullCourseCSVUpload';
import { AliasManager } from './AliasManager/AliasManager';
import { CourseData, ParsedFullCourseData, BatchDocumentResult } from '../../types/course';
import { useCourseState } from '../../hooks/useCourseState';
import { fullCourseDocumentGenerator } from '../../services/fullCourseDocumentGenerator';
import { FiArrowLeft, FiLoader, FiCheckCircle, FiAlertCircle, FiDownload } from 'react-icons/fi';

interface FullCourseAppProps {
  templateFile: File | null;
  onBackToMenu: () => void;
}

type CourseAppStep = 'course-list' | 'csv-upload' | 'alias-management' | 'course-setup' | 'document-generation' | 'course-dashboard';

export const FullCourseApp: React.FC<FullCourseAppProps> = ({ templateFile, onBackToMenu }) => {
  const [currentStep, setCurrentStep] = useState<CourseAppStep>('course-list');
  const [parsedCSVData, setParsedCSVData] = useState<ParsedFullCourseData | null>(null);
  const [createdCourse, setCreatedCourse] = useState<CourseData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0, date: '' });
  const [generateResult, setGenerateResult] = useState<BatchDocumentResult | null>(null);
  const [generateError, setGenerateError] = useState('');

  const {
    courses,
    currentCourse,
    isLoading,
    error,
    loadCourses,
    setCurrentCourse,
    clearError
  } = useCourseState();

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

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

  const handleCourseSelect = async (courseId: string) => {
    await setCurrentCourse(courseId);
    setCurrentStep('course-dashboard');
  };

  const handleNewCourse = () => {
    // Start with CSV upload for full course
    setCurrentStep('csv-upload');
  };

  const handleCSVParsed = (data: ParsedFullCourseData) => {
    setParsedCSVData(data);
    // Go to alias management if there are suggestions, otherwise skip to setup
    if (data.aliasSuggestions.length > 0) {
      setCurrentStep('alias-management');
    } else {
      setCurrentStep('course-setup');
    }
  };

  const handleAliasManagementComplete = (updatedData: ParsedFullCourseData) => {
    setParsedCSVData(updatedData);
    setCurrentStep('course-setup');
  };

  const handleAliasManagementBack = () => {
    setCurrentStep('csv-upload');
  };

  const handleCourseSetupComplete = (courseData: CourseData) => {
    setCreatedCourse(courseData);
    // If we have parsed CSV data (new course from CSV), go to document generation
    if (parsedCSVData) {
      setCurrentStep('document-generation');
    } else {
      // Otherwise go to dashboard (editing existing course)
      setCurrentStep('course-dashboard');
    }
  };

  const handleDocumentGenerationComplete = () => {
    setCurrentStep('course-dashboard');
  };

  const handleBackToCourseList = () => {
    setCurrentStep('course-list');
    setCurrentCourse(null);
    setParsedCSVData(null);
  };

  const handleEditCourse = () => {
    setCurrentStep('course-setup');
  };

  if (isLoading && courses.length === 0) {
    return (
      <div className="loading-container">
        <FiLoader className="spinner" />
        <p>Caricamento corsi...</p>
      </div>
    );
  }

  return (
    <div className="full-course-app">
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError} className="btn-close">×</button>
        </div>
      )}

      {currentStep === 'course-list' && (
        <div className="course-list-view">
          <div className="course-list-header">
            <button onClick={onBackToMenu} className="btn btn-back">
              <FiArrowLeft /> Torna al Menu
            </button>
            <h1>I Miei Corsi</h1>
            <button onClick={handleNewCourse} className="btn btn-primary">
              Nuovo Corso
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h2>Nessun corso ancora</h2>
              <p>Crea il tuo primo corso per iniziare a gestire lezioni multi-giorno</p>
              <button onClick={handleNewCourse} className="btn btn-primary btn-large">
                Crea Primo Corso
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <div 
                  key={course.courseId} 
                  className="course-card"
                  onClick={() => handleCourseSelect(course.courseId)}
                >
                  <div className="course-header">
                    <h3>{course.courseInfo.name}</h3>
                    <div className="course-status">
                      {course.metadata.completedLessons}/{course.metadata.totalLessons} lezioni
                    </div>
                  </div>
                  
                  <div className="course-info">
                    <div className="course-dates">
                      {course.courseInfo.startDate} - {course.courseInfo.endDate}
                    </div>
                    <div className="course-participants">
                      {course.participants.filter(p => p.isActive).length} partecipanti
                    </div>
                  </div>

                  <div className="course-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${(course.metadata.completedLessons / course.metadata.totalLessons) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="progress-text">
                      {Math.round((course.metadata.completedLessons / course.metadata.totalLessons) * 100)}% completato
                    </span>
                  </div>

                  <div className="course-meta">
                    <div className="course-instructor">
                      Docente: {course.courseInfo.instructor.name}
                    </div>
                    <div className="course-updated">
                      Aggiornato: {new Date(course.metadata.updatedAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentStep === 'csv-upload' && (
        <FullCourseCSVUpload
          onParsed={handleCSVParsed}
          onCancel={handleBackToCourseList}
        />
      )}

      {currentStep === 'alias-management' && parsedCSVData && (
        <AliasManager
          parsedData={parsedCSVData}
          onComplete={handleAliasManagementComplete}
          onBack={handleAliasManagementBack}
        />
      )}

      {currentStep === 'course-setup' && (
        <CourseSetup
          onComplete={handleCourseSetupComplete}
          onCancel={handleBackToCourseList}
          initialData={currentCourse || undefined}
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
                <button onClick={handleBackToCourseList} className="btn btn-secondary">
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
                <button onClick={handleBackToCourseList} className="btn btn-secondary">
                  <FiArrowLeft /> Indietro
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {currentStep === 'course-dashboard' && currentCourse && (
        <div className="course-dashboard-view">
          <div className="dashboard-header">
            <button onClick={handleBackToCourseList} className="btn btn-back">
              <FiArrowLeft /> Tutti i Corsi
            </button>
          </div>
          <CourseDashboard
            course={currentCourse}
            onEditCourse={handleEditCourse}
          />
        </div>
      )}

      <style>{`
        .full-course-app {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 50vh;
          color: #6c757d;
        }

        .spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
          margin-bottom: 15px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-banner {
          background: #f8d7da;
          color: #721c24;
          padding: 12px 20px;
          margin: 20px;
          border-radius: 6px;
          border: 1px solid #f5c6cb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner p {
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          color: #721c24;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .course-list-view {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .course-list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .course-list-header h1 {
          margin: 0;
          color: #212529;
          font-size: 1.8rem;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          border: 1px solid #e9ecef;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .empty-state h2 {
          margin: 0 0 10px 0;
          color: #212529;
          font-size: 1.5rem;
        }

        .empty-state p {
          margin: 0 0 30px 0;
          color: #6c757d;
          font-size: 1.1rem;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .course-card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #007bff;
        }

        .course-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .course-header h3 {
          margin: 0;
          color: #212529;
          font-size: 1.2rem;
          font-weight: 600;
          flex: 1;
          margin-right: 10px;
        }

        .course-status {
          background: #e3f2fd;
          color: #0277bd;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .course-info {
          margin-bottom: 15px;
        }

        .course-dates {
          color: #495057;
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        .course-participants {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .course-progress {
          margin-bottom: 15px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: #e9ecef;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 5px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #28a745);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .course-meta {
          border-top: 1px solid #f1f3f4;
          padding-top: 15px;
        }

        .course-instructor {
          font-size: 0.9rem;
          color: #495057;
          margin-bottom: 5px;
        }

        .course-updated {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .course-dashboard-view {
          background: white;
        }

        .dashboard-header {
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
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
