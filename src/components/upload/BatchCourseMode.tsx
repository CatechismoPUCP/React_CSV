import React, { useState, useCallback } from 'react';
import { FiUpload, FiFile, FiCheckCircle, FiAlertCircle, FiCalendar, FiUsers, FiDownload, FiLoader } from 'react-icons/fi';
import { batchCSVProcessor } from '../../services/batchCSVProcessor';
import { BatchCSVFile, DayCSVPair, CompleteBatchResult } from '../../types/course';

interface BatchCourseModeProps {
  templateFile: File | null;
  onComplete?: () => void;
  onCancel?: () => void;
}

type Step = 'upload' | 'review' | 'processing' | 'completed';

export const BatchCourseMode: React.FC<BatchCourseModeProps> = ({
  templateFile,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<BatchCSVFile[]>([]);
  const [dayPairs, setDayPairs] = useState<DayCSVPair[]>([]);
  const [courseName, setCourseName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentDate: '' });
  const [result, setResult] = useState<CompleteBatchResult | null>(null);
  const [error, setError] = useState('');

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const fileArray = Array.from(files);
      const { uploadedFiles: analyzed, dayPairs: pairs } = await batchCSVProcessor.analyzeCSVFiles(fileArray);

      setUploadedFiles(analyzed);
      setDayPairs(pairs);
      setIsAnalyzing(false);

      if (pairs.length === 0) {
        setError('Nessun giorno rilevato nei file CSV. Verifica che i file siano corretti.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'analisi dei file');
      setIsAnalyzing(false);
    }
  };

  const handleProceedToReview = () => {
    if (!courseName.trim()) {
      setError('Inserisci il nome del corso');
      return;
    }
    if (!templateFile) {
      setError('Seleziona un file template dal menu principale (Modalità Giorno Singolo)');
      return;
    }
    if (dayPairs.length === 0) {
      setError('Carica almeno un giorno di lezione');
      return;
    }

    setStep('review');
  };

  const handleStartProcessing = async () => {
    if (!templateFile) return;

    setStep('processing');
    setError('');

    try {
      const batchResult = await batchCSVProcessor.processAllDays(
        dayPairs,
        templateFile,
        courseName,
        (current, total, date) => {
          setProcessingProgress({ current, total, currentDate: date });
        }
      );

      setResult(batchResult);
      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il processing');
      setStep('review');
    }
  };

  const handleDownloadZIP = () => {
    if (result?.zipData && result?.zipFilename) {
      batchCSVProcessor.downloadZIP(result.zipData, result.zipFilename);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setUploadedFiles([]);
    setDayPairs([]);
    setCourseName('');
    setResult(null);
    setError('');
  };

  // Render upload step
  if (step === 'upload') {
    return (
      <div className="batch-course-mode">
        <div className="batch-header">
          <h2>📚 Modalità: Tutto il Corso</h2>
          <p>Carica tutti i CSV del corso (mattine e pomeriggi) e genera tutti i documenti in batch</p>
        </div>

        {error && (
          <div className="error-banner">
            <FiAlertCircle /> {error}
          </div>
        )}

        <div className="batch-upload-section">
          <div className="form-group">
            <label htmlFor="courseName">Nome del Corso *</label>
            <input
              id="courseName"
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="es: AI - Intelligenza Artificiale"
              className="form-input"
            />
          </div>

          {templateFile ? (
            <div className="template-info">
              <FiCheckCircle style={{ color: '#28a745' }} />
              <div>
                <strong>Template Word:</strong> {templateFile.name}
                <p className="hint" style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6c757d' }}>
                  (Usa lo stesso template del Giorno Singolo)
                </p>
              </div>
            </div>
          ) : (
            <div className="template-warning">
              <FiAlertCircle style={{ color: '#ffc107' }} />
              <div>
                <strong>Nessun template caricato</strong>
                <p className="hint" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                  Carica prima un template dalla modalità "Giorno Singolo"
                </p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="csvFiles">File CSV (Mattine e Pomeriggi) *</label>
            <div className="file-drop-zone">
              <FiUpload className="upload-icon" />
              <p>Trascina qui i file CSV oppure</p>
              <label className="btn btn-secondary">
                <input
                  id="csvFiles"
                  type="file"
                  accept=".csv"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  style={{ display: 'none' }}
                />
                Seleziona File CSV
              </label>
              <p className="hint">Puoi selezionare più file contemporaneamente</p>
            </div>
          </div>

          {isAnalyzing && (
            <div className="analyzing-status">
              <FiLoader className="spinner" />
              <p>Analisi file in corso...</p>
            </div>
          )}

          {uploadedFiles.length > 0 && !isAnalyzing && (
            <div className="files-summary">
              <h3>File Caricati ({uploadedFiles.length})</h3>
              <div className="files-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <FiFile />
                    <span className="file-name">{file.fileName}</span>
                    <span className={`period-badge ${file.period}`}>
                      {file.period === 'morning' ? '🌅 Mattina' : file.period === 'afternoon' ? '🌆 Pomeriggio' : '❓ Sconosciuto'}
                    </span>
                    {file.detectedDate && (
                      <span className="date-badge">{file.detectedDate}</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="days-summary">
                <h3>
                  <FiCalendar /> Giorni Rilevati ({dayPairs.length})
                </h3>
                <div className="days-grid">
                  {dayPairs.map((pair, index) => (
                    <div key={index} className={`day-card ${pair.isComplete ? 'complete' : 'incomplete'}`}>
                      <div className="day-date">{pair.date}</div>
                      <div className="day-files">
                        {pair.morningFile && <span className="badge morning">Mattina</span>}
                        {pair.afternoonFile && <span className="badge afternoon">Pomeriggio</span>}
                      </div>
                      {!pair.isComplete && (
                        <div className="day-warning">
                          <FiAlertCircle /> Incompleto
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="batch-actions">
          {dayPairs.length > 0 && (
            <button onClick={handleProceedToReview} className="btn btn-primary btn-large">
              Procedi alla Revisione →
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="btn btn-text">
              Annulla
            </button>
          )}
        </div>

        <style>{batchStyles}</style>
      </div>
    );
  }

  // Render review step
  if (step === 'review') {
    const completeDays = dayPairs.filter(p => p.isComplete).length;
    const incompleteDays = dayPairs.length - completeDays;

    return (
      <div className="batch-course-mode">
        <div className="batch-header">
          <h2>📋 Revisione Corso</h2>
          <p>Verifica i dati e avvia la generazione dei documenti</p>
        </div>

        {error && (
          <div className="error-banner">
            <FiAlertCircle /> {error}
          </div>
        )}

        <div className="review-summary">
          <div className="summary-card">
            <h3>{courseName}</h3>
            <div className="summary-stats">
              <div className="stat">
                <FiCalendar className="stat-icon" />
                <div>
                  <div className="stat-value">{dayPairs.length}</div>
                  <div className="stat-label">Giorni totali</div>
                </div>
              </div>
              <div className="stat">
                <FiCheckCircle className="stat-icon complete" />
                <div>
                  <div className="stat-value">{completeDays}</div>
                  <div className="stat-label">Giorni completi</div>
                </div>
              </div>
              {incompleteDays > 0 && (
                <div className="stat">
                  <FiAlertCircle className="stat-icon incomplete" />
                  <div>
                    <div className="stat-value">{incompleteDays}</div>
                    <div className="stat-label">Giorni incompleti</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="days-detail">
            <h3>Dettaglio Giorni</h3>
            {dayPairs.map((pair, index) => (
              <div key={index} className={`day-detail-card ${pair.isComplete ? '' : 'incomplete'}`}>
                <div className="day-header">
                  <FiCalendar />
                  <strong>{pair.date}</strong>
                  {pair.isComplete ? (
                    <span className="status-badge complete">
                      <FiCheckCircle /> Completo
                    </span>
                  ) : (
                    <span className="status-badge incomplete">
                      <FiAlertCircle /> Incompleto
                    </span>
                  )}
                </div>
                <div className="day-info">
                  {pair.morningFile && (
                    <div className="file-info">
                      🌅 <strong>Mattina:</strong> {pair.morningFile.fileName}
                    </div>
                  )}
                  {pair.afternoonFile && (
                    <div className="file-info">
                      🌆 <strong>Pomeriggio:</strong> {pair.afternoonFile.fileName}
                    </div>
                  )}
                  {pair.participantCount > 0 && (
                    <div className="participants-info">
                      <FiUsers /> {pair.participantCount} partecipanti rilevati
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {incompleteDays > 0 && (
            <div className="warning-box">
              <FiAlertCircle />
              <div>
                <strong>Attenzione:</strong> {incompleteDays} giorni non hanno sia mattina che pomeriggio.
                I documenti verranno generati comunque con i dati disponibili.
              </div>
            </div>
          )}
        </div>

        <div className="batch-actions">
          <button onClick={handleStartProcessing} className="btn btn-primary btn-large">
            <FiCheckCircle /> Genera Tutti i Documenti
          </button>
          <button onClick={() => setStep('upload')} className="btn btn-secondary">
            ← Torna Indietro
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn btn-text">
              Annulla
            </button>
          )}
        </div>

        <style>{batchStyles}</style>
      </div>
    );
  }

  // Render processing step
  if (step === 'processing') {
    const progress = processingProgress.total > 0
      ? (processingProgress.current / processingProgress.total) * 100
      : 0;

    return (
      <div className="batch-course-mode">
        <div className="batch-header">
          <h2>⚙️ Generazione in Corso...</h2>
          <p>Attendere mentre vengono generati i documenti</p>
        </div>

        <div className="processing-status">
          <FiLoader className="spinner-large" />
          <h3>
            Processing giorno {processingProgress.current} di {processingProgress.total}
          </h3>
          {processingProgress.currentDate && (
            <p className="current-date">Data: {processingProgress.currentDate}</p>
          )}

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-text">{Math.round(progress)}%</div>
        </div>

        <style>{batchStyles}</style>
      </div>
    );
  }

  // Render completed step
  if (step === 'completed' && result) {
    return (
      <div className="batch-course-mode">
        <div className="batch-header">
          <div className="success-icon-large">
            <FiCheckCircle />
          </div>
          <h2>✅ Generazione Completata!</h2>
          <p>Tutti i documenti sono stati generati con successo</p>
        </div>

        <div className="result-summary">
          <div className="result-stats">
            <div className="result-stat success">
              <div className="result-stat-value">{result.successfulDays}</div>
              <div className="result-stat-label">Documenti Generati</div>
            </div>
            {result.failedDays > 0 && (
              <div className="result-stat failed">
                <div className="result-stat-value">{result.failedDays}</div>
                <div className="result-stat-label">Errori</div>
              </div>
            )}
          </div>

          {result.zipFilename && (
            <div className="download-section">
              <button onClick={handleDownloadZIP} className="btn btn-primary btn-large">
                <FiDownload /> Scarica ZIP - {result.zipFilename}
              </button>
              <p className="download-hint">
                Il file ZIP contiene {result.successfulDays} documenti Word
              </p>
            </div>
          )}

          <div className="results-detail">
            <h3>Dettaglio Documenti</h3>
            {result.dayResults.map((dayResult, index) => (
              <div key={index} className={`result-card ${dayResult.success ? 'success' : 'failed'}`}>
                <div className="result-header">
                  {dayResult.success ? (
                    <FiCheckCircle className="result-icon success" />
                  ) : (
                    <FiAlertCircle className="result-icon failed" />
                  )}
                  <span className="result-date">{dayResult.date}</span>
                  {dayResult.documentFilename && (
                    <span className="result-filename">{dayResult.documentFilename}</span>
                  )}
                </div>
                {dayResult.error && (
                  <div className="result-error">{dayResult.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="batch-actions">
          <button onClick={handleReset} className="btn btn-secondary">
            Nuovo Batch
          </button>
          {onComplete && (
            <button onClick={onComplete} className="btn btn-primary">
              Fine
            </button>
          )}
        </div>

        <style>{batchStyles}</style>
      </div>
    );
  }

  return null;
};

const batchStyles = `
  .batch-course-mode {
    max-width: 1000px;
    margin: 0 auto;
    padding: 30px 20px;
  }

  .batch-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .batch-header h2 {
    margin: 0 0 10px 0;
    color: #212529;
    font-size: 1.8rem;
  }

  .batch-header p {
    margin: 0;
    color: #6c757d;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 12px 20px;
    border-radius: 6px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .batch-upload-section {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .form-group {
    margin-bottom: 25px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    color: #495057;
    font-weight: 500;
  }

  .form-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ced4da;
    border-radius: 6px;
    font-size: 1rem;
  }

  .file-drop-zone {
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    padding: 40px;
    text-align: center;
    background: #f8f9fa;
    transition: all 0.3s;
  }

  .file-drop-zone:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }

  .upload-icon {
    font-size: 2.5rem;
    color: #6c757d;
    margin-bottom: 15px;
  }

  .file-drop-zone p {
    margin: 10px 0;
    color: #6c757d;
  }

  .hint {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .file-selected {
    margin-top: 10px;
    padding: 8px 12px;
    background: #e7f3ff;
    color: #0277bd;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .template-info {
    margin-bottom: 20px;
    padding: 15px;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 6px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .template-warning {
    margin-bottom: 20px;
    padding: 15px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .template-info strong,
  .template-warning strong {
    display: block;
    margin-bottom: 4px;
    color: #212529;
  }

  .analyzing-status {
    text-align: center;
    padding: 40px;
  }

  .spinner {
    font-size: 2rem;
    color: #007bff;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }

  .spinner-large {
    font-size: 4rem;
    color: #007bff;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .files-summary, .days-summary {
    margin-top: 30px;
  }

  .files-summary h3, .days-summary h3 {
    margin-bottom: 15px;
    color: #212529;
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
  }

  .file-name {
    flex: 1;
    font-size: 0.9rem;
  }

  .period-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .period-badge.morning {
    background: #fff3cd;
    color: #856404;
  }

  .period-badge.afternoon {
    background: #cce5ff;
    color: #004085;
  }

  .period-badge.unknown {
    background: #f8d7da;
    color: #721c24;
  }

  .date-badge {
    padding: 4px 10px;
    background: #e7f3ff;
    color: #0277bd;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }

  .day-card {
    padding: 15px;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    background: white;
  }

  .day-card.complete {
    border-color: #28a745;
    background: #f1f9f3;
  }

  .day-card.incomplete {
    border-color: #ffc107;
    background: #fffbf0;
  }

  .day-date {
    font-weight: 600;
    color: #212529;
    margin-bottom: 8px;
  }

  .day-files {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .badge {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge.morning {
    background: #fff3cd;
    color: #856404;
  }

  .badge.afternoon {
    background: #cce5ff;
    color: #004085;
  }

  .day-warning {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #856404;
    font-size: 0.85rem;
  }

  .batch-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-primary.btn-large {
    padding: 14px 32px;
    font-size: 1.1rem;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-text {
    background: transparent;
    color: #6c757d;
  }

  .btn-text:hover {
    background: #f8f9fa;
  }

  .review-summary, .result-summary {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .summary-card {
    margin-bottom: 30px;
  }

  .summary-card h3 {
    margin: 0 0 20px 0;
    color: #212529;
    font-size: 1.5rem;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-icon.complete {
    color: #28a745;
  }

  .stat-icon.incomplete {
    color: #ffc107;
  }

  .stat-value {
    font-size: 1.8rem;
    font-weight: bold;
    color: #212529;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .days-detail h3 {
    margin-bottom: 15px;
    color: #212529;
  }

  .day-detail-card {
    padding: 15px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    margin-bottom: 10px;
    background: white;
  }

  .day-detail-card.incomplete {
    border-left: 4px solid #ffc107;
  }

  .day-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .status-badge {
    margin-left: auto;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .status-badge.complete {
    background: #d4edda;
    color: #155724;
  }

  .status-badge.incomplete {
    background: #fff3cd;
    color: #856404;
  }

  .day-info {
    padding-left: 25px;
    font-size: 0.9rem;
    color: #495057;
  }

  .file-info, .participants-info {
    margin-bottom: 5px;
  }

  .warning-box {
    display: flex;
    gap: 12px;
    padding: 15px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    margin-top: 20px;
  }

  .processing-status {
    text-align: center;
    padding: 60px 40px;
  }

  .processing-status h3 {
    margin: 0 0 10px 0;
    color: #212529;
  }

  .current-date {
    color: #6c757d;
    margin-bottom: 30px;
  }

  .progress-bar {
    width: 100%;
    height: 10px;
    background: #e9ecef;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 10px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #28a745);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: #007bff;
  }

  .success-icon-large {
    font-size: 4rem;
    color: #28a745;
    margin-bottom: 20px;
  }

  .result-stats {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin-bottom: 30px;
  }

  .result-stat {
    padding: 20px 40px;
    border-radius: 8px;
    text-align: center;
  }

  .result-stat.success {
    background: #d4edda;
  }

  .result-stat.failed {
    background: #f8d7da;
  }

  .result-stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .result-stat.success .result-stat-value {
    color: #155724;
  }

  .result-stat.failed .result-stat-value {
    color: #721c24;
  }

  .result-stat-label {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .download-section {
    text-align: center;
    margin: 30px 0;
  }

  .download-hint {
    margin-top: 10px;
    color: #6c757d;
    font-size: 0.9rem;
  }

  .results-detail {
    margin-top: 30px;
  }

  .results-detail h3 {
    margin-bottom: 15px;
    color: #212529;
  }

  .result-card {
    padding: 12px;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 8px;
  }

  .result-card.success {
    border-left: 4px solid #28a745;
    background: #f8fff9;
  }

  .result-card.failed {
    border-left: 4px solid #dc3545;
    background: #fff8f8;
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .result-icon {
    font-size: 1.2rem;
  }

  .result-icon.success {
    color: #28a745;
  }

  .result-icon.failed {
    color: #dc3545;
  }

  .result-date {
    font-weight: 600;
    color: #212529;
  }

  .result-filename {
    color: #6c757d;
    font-size: 0.9rem;
    margin-left: auto;
  }

  .result-error {
    margin-top: 8px;
    padding: 8px;
    background: #f8d7da;
    color: #721c24;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .batch-course-mode {
      padding: 20px 15px;
    }

    .summary-stats, .days-grid, .result-stats {
      grid-template-columns: 1fr;
    }

    .batch-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
`;
