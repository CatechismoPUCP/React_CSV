import React, { useState } from 'react';
import { ParsedFullCourseData, FullCourseParticipantInfo, AliasSuggestion } from '../../../types/course';
import { aliasManagementService } from '../../../services/aliasManagementService';
import { FiUsers, FiAlertCircle, FiCheckCircle, FiX, FiCheck, FiArrowLeft, FiArrowRight, FiHelpCircle } from 'react-icons/fi';

interface AliasManagerProps {
  parsedData: ParsedFullCourseData;
  onComplete: (updatedData: ParsedFullCourseData) => void;
  onBack: () => void;
}

type Step = 'intro' | 'auto-review' | 'manual-merge' | 'confirmation';

interface MergeDecision {
  suggestionIndex: number;
  accepted: boolean;
}

export const AliasManager: React.FC<AliasManagerProps> = ({
  parsedData,
  onComplete,
  onBack
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [mergeDecisions, setMergeDecisions] = useState<Map<number, boolean>>(new Map());
  const [customMerges, setCustomMerges] = useState<Map<string, string[]>>(new Map());
  const [manualSelected, setManualSelected] = useState<Set<number>>(new Set());
  const [manualMain, setManualMain] = useState<string>('');
  const [manualAlias, setManualAlias] = useState<string>('');
  const [customSuggestions, setCustomSuggestions] = useState<AliasSuggestion[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Extract data from parsedData
  const participants = parsedData.allParticipants;
  const aliasSuggestions = parsedData.aliasSuggestions;

  // Filter suggestions
  const autoMergeSuggestions = aliasSuggestions.filter(s => s.autoMerged);
  const manualSuggestions = aliasSuggestions.filter(s => !s.autoMerged);

  const handleAcceptMerge = () => {
    setMergeDecisions(prev => new Map(prev).set(currentReviewIndex, true));
    moveToNextSuggestion();
  };

  const handleRejectMerge = () => {
    setMergeDecisions(prev => new Map(prev).set(currentReviewIndex, false));
    moveToNextSuggestion();
  };

  const moveToNextSuggestion = () => {
    if (currentReviewIndex < autoMergeSuggestions.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
    } else {
      // Finished reviewing auto-merges
      setCurrentStep(manualSuggestions.length > 0 ? 'manual-merge' : 'confirmation');
    }
  };

  const handleComplete = () => {
    // Apply accepted merges
    const acceptedSuggestions = autoMergeSuggestions.filter((_, idx) =>
      mergeDecisions.get(idx) === true
    );

    const selectedManual = manualSuggestions.filter((_, idx) => manualSelected.has(idx));

    const { mergedParticipants } = aliasManagementService.applyAliasMappings(
      participants,
      [...acceptedSuggestions, ...selectedManual, ...customSuggestions],
      { forceMergeAll: true }
    );

    // Return updated parsed data with merged participants
    const updatedData: ParsedFullCourseData = {
      ...parsedData,
      allParticipants: mergedParticipants,
      aliasSuggestions: [...acceptedSuggestions, ...selectedManual, ...customSuggestions]
    };

    onComplete(updatedData);
  };

  const handleSkipAll = () => {
    // Return original data with no merges applied
    const updatedData: ParsedFullCourseData = {
      ...parsedData,
      aliasSuggestions: [] // Clear all suggestions since none were applied
    };
    onComplete(updatedData);
  };

  // INTRO STEP
  if (currentStep === 'intro') {
    return (
      <div className="alias-manager">
        <div className="alias-container">
          <div className="intro-section">
            <div className="intro-icon">
              <FiUsers size={64} color="#007bff" />
            </div>

            <h2>Gestione Alias Partecipanti</h2>

            <div className="intro-explanation">
              <p className="lead">
                Abbiamo rilevato {autoMergeSuggestions.length} possibili alias
                (stessa persona con nomi diversi) tra i partecipanti.
              </p>

              <div className="example-box">
                <h4>Esempio di alias:</h4>
                <div className="alias-example">
                  <span className="name-badge variant">giorgio s.</span>
                  <span className="merge-icon">→</span>
                  <span className="name-badge main">Giorgio Santambrogio</span>
                </div>
                <p className="small">
                  Queste variazioni dello stesso nome verranno unite in un unico partecipante
                </p>
              </div>

              <div className="info-box">
                <FiHelpCircle />
                <div>
                  <strong>Come funziona:</strong>
                  <ol>
                    <li>Ti mostreremo ogni alias rilevato uno alla volta</li>
                    <li>Potrai confermare o rifiutare ogni merge</li>
                    <li>Potrai sempre tornare indietro per correggere</li>
                    <li>Alla fine vedrai un riepilogo prima di salvare</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="intro-actions">
              <button onClick={onBack} className="btn btn-secondary">
                <FiArrowLeft /> Indietro
              </button>

              <button
                onClick={() => setCurrentStep('auto-review')}
                className="btn btn-primary btn-large"
              >
                Inizia Revisione <FiArrowRight />
              </button>

              <button onClick={handleSkipAll} className="btn btn-text">
                Salta (nessun merge)
              </button>
            </div>
          </div>
        </div>

        <style>{aliasManagerStyles}</style>
      </div>
    );
  }

  // AUTO-REVIEW STEP
  if (currentStep === 'auto-review' && autoMergeSuggestions.length > 0) {
    const currentSuggestion = autoMergeSuggestions[currentReviewIndex];
    const progress = ((currentReviewIndex + 1) / autoMergeSuggestions.length) * 100;

    return (
      <div className="alias-manager">
        <div className="alias-container">
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="progress-label">
                Alias {currentReviewIndex + 1} di {autoMergeSuggestions.length}
              </span>
              <span className="progress-percent">{Math.round(progress)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Current Merge Review */}
          <div className="review-card">
            <div className="review-header">
              <h3>Vuoi unire questi nomi?</h3>
              <div className="confidence-badge high">
                <FiCheckCircle />
                {(currentSuggestion.confidence * 100).toFixed(0)}% sicurezza
              </div>
            </div>

            <div className="merge-preview">
              <div className="merge-visual">
                {/* Suggested aliases (will be merged into main) */}
                <div className="alias-group source">
                  <label className="group-label">Verranno uniti in:</label>
                  <div className="alias-badges">
                    {currentSuggestion.suggestedAliases.map((alias, idx) => (
                      <div key={idx} className="name-badge variant">
                        {alias}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <div className="merge-arrow-container">
                  <FiArrowRight size={32} color="#28a745" />
                </div>

                {/* Main name (result after merge) */}
                <div className="alias-group target">
                  <label className="group-label">Nome finale:</label>
                  <div className="name-badge main large">
                    {currentSuggestion.mainName}
                  </div>
                </div>
              </div>

              <div className="merge-explanation">
                <FiHelpCircle />
                <p>
                  Se confermi, <strong>{currentSuggestion.suggestedAliases.join(', ')}</strong> verranno
                  considerati come <strong>{currentSuggestion.mainName}</strong> e tutte le loro
                  presenze verranno unite.
                </p>
              </div>
            </div>

            {/* Decision Buttons */}
            <div className="decision-buttons">
              <button
                onClick={handleRejectMerge}
                className="btn btn-reject"
              >
                <FiX size={20} />
                No, sono persone diverse
              </button>

              <button
                onClick={handleAcceptMerge}
                className="btn btn-accept"
              >
                <FiCheck size={20} />
                Sì, unisci questi nomi
              </button>
            </div>

            {/* Quick Navigation */}
            <div className="quick-nav">
              {currentReviewIndex > 0 && (
                <button
                  onClick={() => setCurrentReviewIndex(currentReviewIndex - 1)}
                  className="btn btn-sm btn-secondary"
                >
                  <FiArrowLeft /> Precedente
                </button>
              )}

              <button onClick={() => setCurrentStep('intro')} className="btn btn-sm btn-text">
                Torna all'inizio
              </button>
            </div>
          </div>
        </div>

        <style>{aliasManagerStyles}</style>
      </div>
    );
  }

  // MANUAL MERGE STEP
  if (currentStep === 'manual-merge') {
    return (
      <div className="alias-manager">
        <div className="alias-container">
          <div className="manual-section">
            <h2>Merge Manuali (Opzionale)</h2>

            <div className="info-box">
              <FiHelpCircle />
              <p>
                Abbiamo trovato altri {manualSuggestions.length} possibili alias con
                sicurezza media-bassa. Puoi unirli manualmente se riconosci che sono
                la stessa persona.
              </p>
            </div>

            {manualSuggestions.map((suggestion, idx) => (
              <div key={idx} className="manual-suggestion">
                <div className="suggestion-header">
                  <span className="name-badge">{suggestion.mainName}</span>
                  <span className="merge-icon">←</span>
                  <span className="name-badge variant">
                    {suggestion.suggestedAliases.join(', ')}
                  </span>
                  <span className={`confidence-badge ${suggestion.confidence >= 0.7 ? 'medium' : 'low'}`}>
                    {(suggestion.confidence * 100).toFixed(0)}% match
                  </span>
                </div>
                <button
                  className={`btn btn-sm ${manualSelected.has(idx) ? 'btn-success' : 'btn-primary'}`}
                  onClick={() => {
                    setManualSelected(prev => {
                      const next = new Set(prev);
                      if (next.has(idx)) next.delete(idx); else next.add(idx);
                      return next;
                    });
                  }}
                >
                  {manualSelected.has(idx) ? 'Selezionato' : 'Unisci Manualmente'}
                </button>
              </div>
            ))}

            <div className="custom-merge">
              <h3>Merge Personalizzato</h3>
              <div className="custom-row">
                <select value={manualMain} onChange={e => setManualMain(e.target.value)}>
                  <option value="">Seleziona nome principale</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.primaryName}>{p.primaryName}</option>
                  ))}
                </select>
              </div>
              <div className="custom-row">
                <select value={manualAlias} onChange={e => setManualAlias(e.target.value)}>
                  <option value="">Seleziona alias da unire</option>
                  {participants.map(p => (
                    <option key={`a-${p.id}`} value={p.primaryName}>{p.primaryName}</option>
                  ))}
                </select>
              </div>
              <div className="custom-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (!manualMain || !manualAlias || manualMain === manualAlias) return;
                    const main = participants.find(p => p.primaryName === manualMain);
                    if (!main) return;
                    const suggestion: AliasSuggestion = {
                      participantId: main.id,
                      mainName: manualMain,
                      suggestedAliases: [manualAlias],
                      similarityScores: [1],
                      autoMerged: false,
                      confidence: 1,
                    };
                    setCustomSuggestions(prev => [...prev, suggestion]);
                    setManualAlias('');
                  }}
                >Aggiungi Merge</button>
              </div>
              {customSuggestions.length > 0 && (
                <div className="custom-list">
                  {customSuggestions.map((s, i) => (
                    <div key={`c-${i}`} className="summary-merge">
                      <span className="merge-text"><strong>{s.mainName}</strong> ← {s.suggestedAliases.join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="manual-actions">
              <button onClick={onBack} className="btn btn-secondary">
                <FiArrowLeft /> Indietro
              </button>
              <button
                onClick={() => setCurrentStep('confirmation')}
                className="btn btn-primary"
              >
                Continua <FiArrowRight />
              </button>
            </div>
          </div>
        </div>

        <style>{aliasManagerStyles}</style>
      </div>
    );
  }

  // CONFIRMATION STEP
  if (currentStep === 'confirmation') {
    const acceptedCount = Array.from(mergeDecisions.values()).filter(v => v).length;
    const manualCount = manualSelected.size;
    const rejectedCount = Array.from(mergeDecisions.values()).filter(v => !v).length;
    const pendingAutoCount = autoMergeSuggestions.filter((_, idx) => !mergeDecisions.has(idx)).length;

    return (
      <div className="alias-manager">
        <div className="alias-container">
          <div className="confirmation-section">
            <div className="confirmation-icon">
              <FiCheckCircle size={64} color="#28a745" />
            </div>

            <h2>Riepilogo Modifiche</h2>

            <div className="summary-stats">
              <div className="stat-card success">
                <div className="stat-value">{acceptedCount}</div>
                <div className="stat-label">Merge confermati</div>
              </div>
              <div className="stat-card danger">
                <div className="stat-value">{rejectedCount}</div>
                <div className="stat-label">Merge rifiutati</div>
              </div>
            </div>

            {acceptedCount > 0 && (
              <div className="merge-summary">
                <h4>Alias che verranno uniti:</h4>
                {autoMergeSuggestions
                  .map((suggestion, idx) => ({ suggestion, idx }))
                  .filter(({ idx }) => mergeDecisions.get(idx) === true)
                  .map(({ suggestion, idx }) => (
                    <div key={idx} className="summary-merge">
                      <FiCheck color="#28a745" />
                      <span className="merge-text">
                        <strong>{suggestion.mainName}</strong> ← {suggestion.suggestedAliases.join(', ')}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {manualCount > 0 && (
              <div className="merge-summary">
                <h4>Merge manuali selezionati:</h4>
                {manualSuggestions
                  .map((suggestion, idx) => ({ suggestion, idx }))
                  .filter(({ idx }) => manualSelected.has(idx))
                  .map(({ suggestion, idx }) => (
                    <div key={`m-${idx}`} className="summary-merge">
                      <FiCheck color="#28a745" />
                      <span className="merge-text">
                        <strong>{suggestion.mainName}</strong> ← {suggestion.suggestedAliases.join(', ')}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {customSuggestions.length > 0 && (
              <div className="merge-summary">
                <h4>Merge personalizzati:</h4>
                {customSuggestions.map((suggestion, idx) => (
                  <div key={`cm-${idx}`} className="summary-merge">
                    <FiCheck color="#28a745" />
                    <span className="merge-text">
                      <strong>{suggestion.mainName}</strong> ← {suggestion.suggestedAliases.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="warning-box">
              <FiAlertCircle />
              <p>
                <strong>Attenzione:</strong> Una volta confermato, le modifiche non potranno
                essere annullate. Assicurati che i merge siano corretti.
              </p>
              {pendingAutoCount > 0 && (
                <p>
                  Devi rivedere tutti i merge automatici: {pendingAutoCount} ancora in sospeso.
                </p>
              )}
            </div>

            <div className="confirmation-actions">
              <button
                onClick={() => setCurrentStep('auto-review')}
                className="btn btn-secondary"
              >
                <FiArrowLeft /> Rivedi Scelte
              </button>

              <button
                onClick={handleComplete}
                className="btn btn-success btn-large"
                disabled={pendingAutoCount > 0}
              >
                <FiCheck /> Conferma e Continua
              </button>

              <button onClick={handleSkipAll} className="btn btn-text">
                Annulla (no merge)
              </button>
            </div>
          </div>
        </div>

        <style>{aliasManagerStyles}</style>
      </div>
    );
  }

  return null;
};

const aliasManagerStyles = `
  .alias-manager {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .alias-container {
    max-width: 900px;
    width: 100%;
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    padding: 40px;
  }

  /* Intro Section */
  .intro-section {
    text-align: center;
  }

  .intro-icon {
    margin-bottom: 20px;
  }

  .intro-section h2 {
    margin: 0 0 20px 0;
    color: #212529;
    font-size: 2rem;
  }

  .intro-explanation {
    text-align: left;
    margin: 30px 0;
  }

  .lead {
    font-size: 1.2rem;
    color: #495057;
    margin-bottom: 25px;
    text-align: center;
  }

  .example-box {
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
  }

  .example-box h4 {
    margin: 0 0 15px 0;
    color: #495057;
    font-size: 1rem;
  }

  .alias-example {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    margin: 15px 0;
  }

  .merge-icon {
    font-size: 1.5rem;
    color: #28a745;
    font-weight: bold;
  }

  .name-badge {
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 500;
    font-size: 0.95rem;
    display: inline-block;
  }

  .name-badge.main {
    background: #28a745;
    color: white;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
  }

  .name-badge.main.large {
    padding: 12px 24px;
    font-size: 1.2rem;
  }

  .name-badge.variant {
    background: #ffc107;
    color: #000;
  }

  .small {
    font-size: 0.85rem;
    color: #6c757d;
    text-align: center;
    margin-top: 10px;
  }

  .info-box {
    background: #e7f3ff;
    border-left: 4px solid #007bff;
    padding: 15px;
    border-radius: 6px;
    display: flex;
    gap: 12px;
    margin: 20px 0;
  }

  .info-box svg {
    color: #007bff;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .info-box strong {
    color: #004085;
  }

  .info-box ol {
    margin: 10px 0 0 0;
    padding-left: 20px;
  }

  .info-box li {
    margin: 5px 0;
    color: #004085;
  }

  .intro-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
    flex-wrap: wrap;
  }

  /* Progress Section */
  .progress-section {
    margin-bottom: 30px;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .progress-label {
    font-weight: 600;
    color: #495057;
  }

  .progress-percent {
    font-weight: 600;
    color: #007bff;
  }

  .progress-bar {
    height: 8px;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #007bff, #28a745);
    transition: width 0.3s ease;
  }

  /* Review Card */
  .review-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 30px;
  }

  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    flex-wrap: wrap;
    gap: 15px;
  }

  .review-header h3 {
    margin: 0;
    color: #212529;
    font-size: 1.5rem;
  }

  .confidence-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .confidence-badge.high {
    background: #d4edda;
    color: #155724;
  }

  .confidence-badge.medium {
    background: #fff3cd;
    color: #856404;
  }

  .confidence-badge.low {
    background: #f8d7da;
    color: #721c24;
  }

  /* Merge Preview */
  .merge-preview {
    background: white;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 25px;
  }

  .merge-visual {
    display: grid;
    grid-template-columns: 2fr auto 2fr;
    gap: 20px;
    align-items: center;
    margin-bottom: 25px;
  }

  .alias-group {
    text-align: center;
  }

  .group-label {
    display: block;
    font-size: 0.85rem;
    color: #6c757d;
    font-weight: 600;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .alias-badges {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .merge-arrow-container {
    display: flex;
    justify-content: center;
    padding: 0 10px;
  }

  .merge-explanation {
    background: #e7f3ff;
    border-left: 4px solid #007bff;
    padding: 15px;
    border-radius: 6px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .merge-explanation svg {
    color: #007bff;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .merge-explanation p {
    margin: 0;
    color: #004085;
    font-size: 0.95rem;
  }

  /* Decision Buttons */
  .decision-buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-reject {
    background: #dc3545;
    color: white;
  }

  .btn-reject:hover {
    background: #c82333;
  }

  .btn-accept {
    background: #28a745;
    color: white;
  }

  .btn-accept:hover {
    background: #218838;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
  }

  .btn-primary.btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #545b62;
  }

  .btn-success {
    background: #28a745;
    color: white;
  }

  .btn-success:hover {
    background: #218838;
  }

  .btn-success.btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
  }

  .btn-text {
    background: transparent;
    color: #6c757d;
  }

  .btn-text:hover {
    background: #f8f9fa;
    transform: none;
  }

  .btn-sm {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  /* Quick Navigation */
  .quick-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20px;
    border-top: 1px solid #dee2e6;
  }

  /* Manual Section */
  .manual-section h2 {
    margin: 0 0 20px 0;
    color: #212529;
  }

  .manual-suggestion {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
  }

  .suggestion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex: 1;
  }

  .manual-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
  }

  /* Confirmation Section */
  .confirmation-section {
    text-align: center;
  }

  .confirmation-icon {
    margin-bottom: 20px;
  }

  .confirmation-section h2 {
    margin: 0 0 30px 0;
    color: #212529;
    font-size: 2rem;
  }

  .summary-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 30px 0;
  }

  .stat-card {
    padding: 25px;
    border-radius: 12px;
    text-align: center;
  }

  .stat-card.success {
    background: #d4edda;
    border: 2px solid #28a745;
  }

  .stat-card.danger {
    background: #f8d7da;
    border: 2px solid #dc3545;
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .stat-card.success .stat-value {
    color: #28a745;
  }

  .stat-card.danger .stat-value {
    color: #dc3545;
  }

  .stat-label {
    font-size: 0.95rem;
    color: #495057;
    font-weight: 500;
  }

  .merge-summary {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    margin: 25px 0;
    text-align: left;
  }

  .merge-summary h4 {
    margin: 0 0 15px 0;
    color: #495057;
  }

  .summary-merge {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: white;
    border-radius: 6px;
    margin: 8px 0;
  }

  .merge-text {
    font-size: 0.95rem;
    color: #495057;
  }

  .warning-box {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 15px;
    border-radius: 6px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin: 25px 0;
  }

  .warning-box svg {
    color: #856404;
    flex-shrink: 0;
    margin-top: 3px;
  }

  .warning-box p {
    margin: 0;
    color: #856404;
    text-align: left;
  }

  .confirmation-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 30px;
    flex-wrap: wrap;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .alias-container {
      padding: 25px;
    }

    .merge-visual {
      grid-template-columns: 1fr;
      gap: 15px;
    }

    .merge-arrow-container {
      transform: rotate(90deg);
    }

    .decision-buttons {
      grid-template-columns: 1fr;
    }

    .intro-actions,
    .manual-actions,
    .confirmation-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }

    .summary-stats {
      grid-template-columns: 1fr;
    }
  }
`;
