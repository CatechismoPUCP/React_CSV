import React, { useState, useCallback, useEffect } from 'react';
import { ParsedFullCourseData } from '../../../types/course';
import { fullCourseProcessor } from '../../../services/fullCourseProcessor';
import { FiUpload, FiCheckCircle, FiAlertCircle, FiLoader, FiUsers, FiCalendar } from 'react-icons/fi';

interface FullCourseCSVUploadProps {
  onParsed: (data: ParsedFullCourseData) => void;
  onCancel?: () => void;
  autoProceed?: boolean;
}

type ProcessingStatus = 'idle' | 'uploading' | 'parsing' | 'completed' | 'error';

export const FullCourseCSVUpload: React.FC<FullCourseCSVUploadProps> = ({
  onParsed,
  onCancel,
  autoProceed = true,
}) => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [parsedData, setParsedData] = useState<ParsedFullCourseData | null>(null);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setError('');

    try {
      // Read file
      const content = await file.text();

      setStatus('parsing');

      // Process CSV
      const data = await fullCourseProcessor.processFullCourseCSV(content);

      // Validate
      const validation = fullCourseProcessor.validateParsedData(data);

      if (!validation.isValid) {
        throw new Error(`Errori nella validazione: ${validation.errors.join(', ')}`);
      }

      setParsedData(data);
      setStatus('completed');

      if (autoProceed) {
        onParsed(data);
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Avvisi:', validation.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setStatus('error');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      handleFile(file);
    } else {
      setError('Per favore carica un file CSV');
      setStatus('error');
    }
  };

  const handleProceed = () => {
    if (parsedData) {
      onParsed(parsedData);
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setError('');
    setParsedData(null);
  };

  // Render different states
  if (status === 'idle') {
    return (
      <div className="full-course-upload">
        <div className="upload-header">
          <h2>Carica CSV Corso Completo</h2>
          <p>Carica un file CSV esportato da Zoom contenente tutte le lezioni del corso</p>
        </div>

        <div
          className={`upload-drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FiUpload className="upload-icon" />
          <h3>Trascina qui il file CSV</h3>
          <p>oppure</p>
          <label className="upload-button">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
            Seleziona File
          </label>
          <p className="upload-hint">File CSV da Zoom (max 10MB)</p>
        </div>

        {onCancel && (
          <div className="upload-actions">
            <button onClick={onCancel} className="btn btn-secondary">
              Annulla
            </button>
          </div>
        )}

        <style>{uploadStyles}</style>
      </div>
    );
  }

  if (status === 'uploading' || status === 'parsing') {
    return (
      <div className="full-course-upload">
        <div className="upload-processing">
          <FiLoader className="spinner" />
          <h3>
            {status === 'uploading' ? 'Caricamento file...' : 'Analisi CSV in corso...'}
          </h3>
          <p>
            {status === 'parsing' && 'Identificazione giorni e partecipanti, rilevamento alias automatico'}
          </p>
        </div>
        <style>{uploadStyles}</style>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="full-course-upload">
        <div className="upload-error">
          <FiAlertCircle className="error-icon" />
          <h3>Errore durante l'elaborazione</h3>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button onClick={handleRetry} className="btn btn-primary">
              Riprova
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-secondary">
                Annulla
              </button>
            )}
          </div>
        </div>
        <style>{uploadStyles}</style>
      </div>
    );
  }

  // Completed - show summary
  if (status === 'completed' && parsedData) {
    const summary = fullCourseProcessor.getProcessingSummary(parsedData);

    return (
      <div className="full-course-upload">
        <div className="upload-success">
          <div className="success-header">
            <FiCheckCircle className="success-icon" />
            <h3>CSV Elaborato con Successo!</h3>
          </div>

          <div className="course-summary">
            <div className="summary-section">
              <h4>{summary.courseName}</h4>
              <p className="course-dates">
                <FiCalendar /> {summary.dateRange}
              </p>
            </div>

            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-value">{summary.totalDays}</div>
                <div className="stat-label">Giorni di lezione</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{summary.totalParticipants}</div>
                <div className="stat-label">Partecipanti unici</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{summary.totalSessions}</div>
                <div className="stat-label">Sessioni totali</div>
              </div>
            </div>

            <div className="summary-section">
              <h5>
                <FiUsers /> Organizzatore
              </h5>
              <p>{summary.organizerName}</p>
            </div>

            <div className="summary-section">
              <h5>
                <FiUsers /> Partecipanti ({summary.participantNames.length})
              </h5>
              <div className="participants-list">
                {summary.participantNames.map((name, index) => (
                  <span key={index} className="participant-badge">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {summary.autoMergedCount > 0 && (
              <div className="summary-section alias-info">
                <FiCheckCircle className="alias-icon" />
                <div>
                  <h5>Alias Rilevati e Uniti Automaticamente</h5>
                  <p>
                    {summary.autoMergedCount} partecipanti sono stati uniti automaticamente
                    perché identificati come alias dello stesso utente
                  </p>
                  <details>
                    <summary>Mostra dettagli</summary>
                    <div className="alias-details">
                      {parsedData.aliasSuggestions
                        .filter(s => s.autoMerged)
                        .map((suggestion, index) => (
                          <div key={index} className="alias-merge">
                            <strong>{suggestion.mainName}</strong>
                            <span className="alias-arrow">←</span>
                            <span className="alias-list">
                              {suggestion.suggestedAliases.join(', ')}
                            </span>
                            <span className="confidence-badge">
                              {(suggestion.confidence * 100).toFixed(0)}% match
                            </span>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>

          <div className="upload-actions">
            <button onClick={handleProceed} className="btn btn-primary btn-large">
              Continua →
            </button>
            <button onClick={handleRetry} className="btn btn-secondary">
              Carica Altro File
            </button>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-text">
                Annulla
              </button>
            )}
          </div>
        </div>

        <style>{uploadStyles}</style>
      </div>
    );
  }

  return null;
};

const uploadStyles = `
  .full-course-upload {
    max-width: 800px;
    margin: 0 auto;
    padding: 30px 20px;
  }

  .upload-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .upload-header h2 {
    margin: 0 0 10px 0;
    color: #212529;
    font-size: 1.8rem;
  }

  .upload-header p {
    margin: 0;
    color: #6c757d;
    font-size: 1rem;
  }

  .upload-drop-zone {
    border: 3px dashed #dee2e6;
    border-radius: 12px;
    padding: 60px 40px;
    text-align: center;
    background: #f8f9fa;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .upload-drop-zone.active {
    border-color: #007bff;
    background: #e7f3ff;
  }

  .upload-drop-zone:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }

  .upload-icon {
    font-size: 3rem;
    color: #6c757d;
    margin-bottom: 20px;
  }

  .upload-drop-zone h3 {
    margin: 0 0 10px 0;
    color: #495057;
    font-size: 1.3rem;
  }

  .upload-drop-zone p {
    margin: 10px 0;
    color: #6c757d;
  }

  .upload-button {
    display: inline-block;
    padding: 12px 30px;
    background: #007bff;
    color: white;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s;
    margin: 10px 0;
  }

  .upload-button:hover {
    background: #0056b3;
  }

  .upload-hint {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .upload-processing {
    text-align: center;
    padding: 80px 40px;
  }

  .spinner {
    font-size: 3rem;
    color: #007bff;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .upload-processing h3 {
    margin: 0 0 10px 0;
    color: #212529;
    font-size: 1.5rem;
  }

  .upload-processing p {
    margin: 0;
    color: #6c757d;
  }

  .upload-error {
    text-align: center;
    padding: 60px 40px;
  }

  .error-icon {
    font-size: 3rem;
    color: #dc3545;
    margin-bottom: 20px;
  }

  .upload-error h3 {
    margin: 0 0 15px 0;
    color: #212529;
    font-size: 1.5rem;
  }

  .error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 25px;
    border: 1px solid #f5c6cb;
  }

  .upload-success {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .success-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e9ecef;
  }

  .success-icon {
    font-size: 3rem;
    color: #28a745;
    margin-bottom: 15px;
  }

  .success-header h3 {
    margin: 0;
    color: #212529;
    font-size: 1.5rem;
  }

  .course-summary {
    margin-bottom: 30px;
  }

  .summary-section {
    margin-bottom: 25px;
  }

  .summary-section h4 {
    margin: 0 0 10px 0;
    color: #212529;
    font-size: 1.3rem;
  }

  .summary-section h5 {
    margin: 0 0 10px 0;
    color: #495057;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .summary-section p {
    margin: 5px 0;
    color: #6c757d;
  }

  .course-dates {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    color: #495057;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin: 25px 0;
  }

  .stat-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #007bff;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #6c757d;
  }

  .participants-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .participant-badge {
    background: #e7f3ff;
    color: #0277bd;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
  }

  .alias-info {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 8px;
    padding: 15px;
    display: flex;
    gap: 12px;
  }

  .alias-icon {
    font-size: 1.5rem;
    color: #28a745;
    flex-shrink: 0;
  }

  .alias-info h5 {
    color: #155724;
    margin-bottom: 5px;
  }

  .alias-info p {
    color: #155724;
    margin: 0;
    font-size: 0.9rem;
  }

  details {
    margin-top: 10px;
  }

  summary {
    cursor: pointer;
    color: #155724;
    font-weight: 500;
    font-size: 0.9rem;
    user-select: none;
  }

  summary:hover {
    text-decoration: underline;
  }

  .alias-details {
    margin-top: 10px;
    padding: 10px;
    background: white;
    border-radius: 6px;
  }

  .alias-merge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    font-size: 0.9rem;
  }

  .alias-arrow {
    color: #6c757d;
    font-weight: bold;
  }

  .alias-list {
    color: #6c757d;
    flex: 1;
  }

  .confidence-badge {
    background: #28a745;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .upload-actions,
  .error-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 25px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
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

  @media (max-width: 768px) {
    .full-course-upload {
      padding: 20px 15px;
    }

    .upload-drop-zone {
      padding: 40px 20px;
    }

    .summary-stats {
      grid-template-columns: 1fr;
    }

    .upload-actions,
    .error-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
`;
