import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ParsedFullCourseData, FullCourseParticipantInfo, AliasSuggestion } from '../../types/course';
import { aliasManagementService } from '../../services/aliasManagementService';
import { FiMove, FiUsers, FiCalendar, FiCheck, FiStar } from 'react-icons/fi';

interface FullCourseParticipantEditorProps {
  parsedData: ParsedFullCourseData;
  onComplete: (updatedData: ParsedFullCourseData) => void;
  onBack: () => void;
}

interface SortableParticipantItemProps {
  participant: FullCourseParticipantInfo;
  index: number;
  isOrganizer: boolean;
  onSetOrganizer: () => void;
  onSplit: () => void;
  mergeMode?: boolean;
  isSelected?: boolean;
  isMain?: boolean;
  onSelectForMerge?: () => void;
}

const SortableParticipantItem: React.FC<SortableParticipantItemProps> = ({
  participant,
  index,
  isOrganizer,
  onSetOrganizer,
  onSplit,
  mergeMode = false,
  isSelected = false,
  isMain = false,
  onSelectForMerge,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `participant-${index}`,
    disabled: mergeMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-participant-item ${isOrganizer ? 'is-organizer' : ''} ${mergeMode ? 'merge-mode' : ''} ${isSelected ? 'is-selected' : ''} ${isMain ? 'is-main' : ''}`}
      onClick={mergeMode ? onSelectForMerge : undefined}
    >
      <div className={`drag-handle ${mergeMode ? 'drag-disabled' : ''}`} {...attributes} {...listeners}>
        <FiMove />
      </div>
      <span className="participant-number">#{index + 1}</span>
      <span className="participant-name">{participant.primaryName}</span>
      <div className="participant-info">
        <span className="participant-days">
          {participant.daysPresent.length} {participant.daysPresent.length === 1 ? 'giorno' : 'giorni'}
        </span>
      </div>
      <button
        onClick={onSetOrganizer}
        className={`btn-organizer ${isOrganizer ? 'active' : ''}`}
        title={isOrganizer ? 'Organizzatore' : 'Imposta come organizzatore'}
        disabled={mergeMode}
      >
        <FiStar />
        {isOrganizer && <span className="organizer-label">Organizzatore</span>}
      </button>
      {participant.aliases.length > 1 && (
        <button
          onClick={onSplit}
          className="btn-split"
          title="Dividi alias in partecipanti separati"
          disabled={mergeMode}
        >
          Split
        </button>
      )}
    </div>
  );
};

export const FullCourseParticipantEditor: React.FC<FullCourseParticipantEditorProps> = ({
  parsedData,
  onComplete,
  onBack,
}) => {
  // Initialize global participant list (all participants across all days)
  const [participants, setParticipants] = useState<FullCourseParticipantInfo[]>(() => {
    // Sort by masterOrder initially
    return [...parsedData.allParticipants].sort((a, b) => a.masterOrder - b.masterOrder);
  });

  // Track who is the organizer
  const [organizerIndex, setOrganizerIndex] = useState<number>(() => {
    // Find current organizer
    return participants.findIndex(p => p.isOrganizer);
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [newAbsentName, setNewAbsentName] = useState('');
  const [newAbsentEmail, setNewAbsentEmail] = useState('');
  const [limitError, setLimitError] = useState('');
  const [aliasSuggestions, setAliasSuggestions] = useState<AliasSuggestion[]>([]);
  const [showAliasPanel, setShowAliasPanel] = useState(false);
  const [selectedAliasIndices, setSelectedAliasIndices] = useState<Set<number>>(new Set());
  const [customSuggestions, setCustomSuggestions] = useState<AliasSuggestion[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [mergeMainId, setMergeMainId] = useState<string | null>(null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = parseInt(active.id.toString().replace('participant-', ''));
    const overIndex = parseInt(over.id.toString().replace('participant-', ''));

    const reordered = arrayMove(participants, activeIndex, overIndex);
    setParticipants(reordered);

    // Update organizer index if affected
    if (activeIndex === organizerIndex) {
      setOrganizerIndex(overIndex);
    } else if (activeIndex < organizerIndex && overIndex >= organizerIndex) {
      setOrganizerIndex(organizerIndex - 1);
    } else if (activeIndex > organizerIndex && overIndex <= organizerIndex) {
      setOrganizerIndex(organizerIndex + 1);
    }
  };

  const handleSetOrganizer = (index: number) => {
    setOrganizerIndex(index);

    // Update isOrganizer flag in participants
    const updated = participants.map((p, i) => ({
      ...p,
      isOrganizer: i === index,
    }));
    setParticipants(updated);
  };

  const handleSplitParticipant = (index: number) => {
    const target = participants[index];
    const aliasesToSplit = target.aliases.filter(a => a !== target.primaryName);
    if (aliasesToSplit.length === 0) return;

    const newEntries: FullCourseParticipantInfo[] = aliasesToSplit.map((alias, i) => ({
      id: `${target.id}_split_${i}_${Date.now()}`,
      primaryName: alias,
      aliases: [alias],
      email: target.email,
      isOrganizer: false,
      masterOrder: (participants[index].masterOrder || index) + i + 1,
      daysPresent: [...target.daysPresent],
    }));

    const updatedTarget: FullCourseParticipantInfo = {
      ...target,
      aliases: [target.primaryName],
    };

    const updatedList = [
      ...participants.slice(0, index),
      updatedTarget,
      ...newEntries,
      ...participants.slice(index + 1),
    ];

    setParticipants(updatedList);
  };

  const addFixedAbsent = () => {
    const name = newAbsentName.trim();
    const email = newAbsentEmail.trim();
    if (!name) return;
    const newEntry: FullCourseParticipantInfo = {
      id: `manual_${name.toLowerCase().replace(/\s+/g,'_')}_${Date.now()}`,
      primaryName: name,
      aliases: [name],
      email,
      isOrganizer: false,
      masterOrder: participants.length + 1,
      daysPresent: [],
    };
    const prospective = [...participants, newEntry];
    const nonOrganizerCount = prospective.filter(p => !p.isOrganizer).length;
    if (nonOrganizerCount > 5) {
      setLimitError('Limite massimo di 5 partecipanti (escluso l\'organizzatore)');
      return;
    }
    setParticipants(prospective);
    setNewAbsentName('');
    setNewAbsentEmail('');
    setLimitError('');
  };

  const detectAliasesInline = () => {
    const suggestions = aliasManagementService.detectAliases(participants);
    setAliasSuggestions(suggestions);
    setSelectedAliasIndices(new Set());
    setShowAliasPanel(true);
  };

  const toggleAliasSelection = (idx: number) => {
    setSelectedAliasIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const applySelectedAliasMerges = () => {
    const selected = aliasSuggestions.filter((_, idx) => selectedAliasIndices.has(idx));
    if (selected.length === 0 && customSuggestions.length === 0) return;
    const { mergedParticipants } = aliasManagementService.applyAliasMappings(participants, [...selected, ...customSuggestions]);
    const sorted = [...mergedParticipants].sort((a, b) => (a.masterOrder || 0) - (b.masterOrder || 0));
    setParticipants(sorted);
    const newOrganizerIndex = sorted.findIndex(p => p.isOrganizer);
    setOrganizerIndex(newOrganizerIndex);
    setAliasSuggestions([]);
    setSelectedAliasIndices(new Set());
    setCustomSuggestions([]);
    setShowAliasPanel(false);
  };

  const autoMergeHighConfidence = () => {
    if (aliasSuggestions.length === 0) return;
    const high = aliasSuggestions.filter(s => s.autoMerged);
    if (high.length === 0) return;
    const { mergedParticipants } = aliasManagementService.applyAliasMappings(participants, high);
    const sorted = [...mergedParticipants].sort((a, b) => (a.masterOrder || 0) - (b.masterOrder || 0));
    setParticipants(sorted);
    const newOrganizerIndex = sorted.findIndex(p => p.isOrganizer);
    setOrganizerIndex(newOrganizerIndex);
    const remaining = aliasSuggestions.filter(s => !s.autoMerged);
    setAliasSuggestions(remaining);
    setSelectedAliasIndices(new Set());
  };

  

  const toggleMergeMode = () => {
    setMergeMode(prev => !prev);
    setSelectedForMerge(new Set());
    setMergeMainId(null);
  };

  const toggleSelectForMerge = (index: number) => {
    if (!mergeMode) return;
    const id = participants[index].id;
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (mergeMainId === id) setMergeMainId(null);
      } else {
        next.add(id);
        if (!mergeMainId) setMergeMainId(id);
      }
      return next;
    });
  };

  const setMainFromSelection = (id: string) => {
    if (selectedForMerge.has(id)) {
      setMergeMainId(id);
    }
  };

  const confirmMergeSelection = () => {
    if (!mergeMode || selectedForMerge.size < 2 || !mergeMainId) return;
    const main = participants.find(p => p.id === mergeMainId);
    if (!main) return;
    const aliases = participants
      .filter(p => selectedForMerge.has(p.id) && p.id !== mergeMainId)
      .map(p => p.primaryName);
    const suggestion: AliasSuggestion = {
      participantId: main.id,
      mainName: main.primaryName,
      suggestedAliases: aliases,
      similarityScores: aliases.map(() => 1),
      autoMerged: false,
      confidence: 1,
    };
    const { mergedParticipants } = aliasManagementService.applyAliasMappings(participants, [suggestion]);
    const sorted = [...mergedParticipants].sort((a, b) => (a.masterOrder || 0) - (b.masterOrder || 0));
    setParticipants(sorted);
    const newOrganizerIndex = sorted.findIndex(p => p.isOrganizer);
    setOrganizerIndex(newOrganizerIndex);
    setMergeMode(false);
    setSelectedForMerge(new Set());
    setMergeMainId(null);
  };

  const handleComplete = () => {
    // Create updated data with participant order and organizer info
    const updatedParticipants = participants.map((p, idx) => ({
      ...p,
      masterOrder: idx,
      isOrganizer: idx === organizerIndex,
    }));

    const nonOrganizerCount = updatedParticipants.filter(p => !p.isOrganizer).length;
    if (nonOrganizerCount > 5) {
      setLimitError('Limite massimo di 5 partecipanti (escluso l\'organizzatore)');
      return;
    }

    const updatedData: ParsedFullCourseData = {
      ...parsedData,
      allParticipants: updatedParticipants,
      organizer: organizerIndex >= 0 ? {
        name: updatedParticipants[organizerIndex].primaryName,
        email: updatedParticipants[organizerIndex].email,
      } : parsedData.organizer,
    };

    onComplete(updatedData);
  };

  return (
    <div className="full-course-participant-editor">
      <div className="editor-header">
        <div className="header-content">
          <h2>Ordina Partecipanti e Seleziona Organizzatore</h2>
          <p className="subtitle">
            Trascina per ordinare i partecipanti e clicca sulla stella per scegliere l'organizzatore
          </p>
        </div>
        <div className="course-summary">
          <div className="summary-item">
            <FiCalendar />
            <span>{parsedData.statistics.totalDays} giorni</span>
          </div>
          <div className="summary-item">
            <FiUsers />
            <span>{parsedData.statistics.totalParticipants} partecipanti</span>
          </div>
        </div>
        <div className="alias-actions">
          <button className="btn btn-secondary" onClick={detectAliasesInline}>Trova Alias</button>
          <button className="btn btn-primary" onClick={applySelectedAliasMerges} disabled={((aliasSuggestions.length === 0 && customSuggestions.length === 0) || (selectedAliasIndices.size === 0 && customSuggestions.length === 0))}>Applica Selezionati</button>
          <button className="btn btn-secondary" onClick={autoMergeHighConfidence} disabled={aliasSuggestions.filter(s => s.autoMerged).length === 0}>Auto-merge Sicuri</button>
          <button className={`btn ${mergeMode ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleMergeMode}>{mergeMode ? 'Annulla Merge Alias' : 'Merge Alias'}</button>
          {mergeMode && (
            <div className="merge-toolbar">
              <span>Seleziona partecipanti da unire</span>
              <select value={mergeMainId ?? ''} onChange={e => setMainFromSelection(e.target.value)}>
                <option value="">Nome finale</option>
                {[...selectedForMerge].map(id => {
                  const p = participants.find(pp => pp.id === id);
                  return p ? <option key={`main-${id}`} value={id}>{p.primaryName}</option> : null;
                })}
              </select>
              <button className="btn btn-primary" onClick={confirmMergeSelection} disabled={!mergeMainId || selectedForMerge.size < 2}>Conferma Unione</button>
            </div>
          )}
        </div>
      </div>

      <div className="info-box">
        <p>
          <strong>💡 Ordine Globale:</strong> L'ordine che definisci qui verrà usato per tutti i giorni del corso.
          L'organizzatore non apparirà nella lista presenze dei documenti Word.
        </p>
      </div>

      <div className="participants-container">
        {limitError && (
          <div className="limit-error-box">{limitError}</div>
        )}
        {showAliasPanel && (
          <div className="alias-panel">
            <h3>Suggerimenti Alias</h3>
            {aliasSuggestions.length === 0 && customSuggestions.length === 0 ? (
              <div className="alias-empty">Nessun suggerimento al momento</div>
            ) : (
              <div className="alias-list">
                {aliasSuggestions.map((s, idx) => (
                  <div key={`s-${idx}`} className={`alias-item ${s.autoMerged ? 'high' : s.confidence >= 0.7 ? 'medium' : 'low'}`}>
                    <label className="alias-select">
                      <input type="checkbox" checked={selectedAliasIndices.has(idx)} onChange={() => toggleAliasSelection(idx)} />
                      <span className="alias-text"><strong>{s.mainName}</strong> ← {s.suggestedAliases.join(', ')}</span>
                    </label>
                    <span className="alias-confidence">{Math.round(s.confidence * 100)}%</span>
                  </div>
                ))}
                {customSuggestions.map((s, idx) => (
                  <div key={`c-${idx}`} className="alias-item custom">
                    <span className="alias-text"><strong>{s.mainName}</strong> ← {s.suggestedAliases.join(', ')}</span>
                    <span className="alias-badge">Manuale</span>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        )}
        <div className="add-absent-fixed">
          <input
            type="text"
            placeholder="Nome assente fisso"
            value={newAbsentName}
            onChange={e => setNewAbsentName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email (opzionale)"
            value={newAbsentEmail}
            onChange={e => setNewAbsentEmail(e.target.value)}
          />
          <button className="btn btn-primary" onClick={addFixedAbsent} disabled={!newAbsentName.trim()}>Aggiungi Assente Fisso</button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={participants.map((_, index) => `participant-${index}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="participants-list">
              {participants.map((participant, index) => (
              <SortableParticipantItem
                key={participant.id}
                participant={participant}
                index={index}
                isOrganizer={index === organizerIndex}
                onSetOrganizer={() => handleSetOrganizer(index)}
                onSplit={() => handleSplitParticipant(index)}
                mergeMode={mergeMode}
                isSelected={mergeMode && selectedForMerge.has(participant.id)}
                isMain={mergeMode && mergeMainId === participant.id}
                onSelectForMerge={() => toggleSelectForMerge(index)}
              />
            ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="actions">
        <button onClick={onBack} className="btn btn-secondary">
          Indietro
        </button>
        <button onClick={handleComplete} className="btn btn-primary" disabled={participants.filter(p => !p.isOrganizer).length > 5}>
          <FiCheck /> Genera Documenti
        </button>
      </div>

      <style>{`
        .full-course-participant-editor {
          max-width: 900px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        .editor-header {
          margin-bottom: 20px;
        }

        .header-content h2 {
          margin: 0 0 8px 0;
          color: #212529;
          font-size: 1.8rem;
        }

        .subtitle {
          margin: 0 0 20px 0;
          color: #6c757d;
          font-size: 1rem;
        }

        .course-summary {
          display: flex;
          gap: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .summary-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #495057;
          font-size: 0.95rem;
        }

        .info-box {
          margin-bottom: 20px;
          padding: 15px;
          background: #e7f3ff;
          border: 1px solid #b3d9ff;
          border-radius: 8px;
        }

        .info-box p {
          margin: 0;
          color: #004085;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .participants-container {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .alias-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .alias-panel {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
          background: #f8f9fa;
        }

        .alias-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .alias-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          background: white;
        }

        .alias-item.high { border-color: #28a745; }
        .alias-item.medium { border-color: #ffc107; }
        .alias-item.low { border-color: #dc3545; }
        .alias-item.custom { border-color: #007bff; }

        .alias-select {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alias-text { color: #212529; }
        .alias-confidence { font-size: 0.85rem; color: #6c757d; }
        .alias-badge { font-size: 0.8rem; color: #007bff; }

        .alias-manual {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          margin-top: 12px;
        }

        .limit-error-box {
          margin-bottom: 10px;
          padding: 10px 12px;
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          font-size: 0.95rem;
        }

        .participants-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sortable-participant-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: white;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          cursor: move;
          transition: all 0.2s;
        }

        .sortable-participant-item:hover {
          background: #f8f9fa;
          border-color: #007bff;
        }

        .sortable-participant-item.is-organizer {
          background: #fff3cd;
          border-color: #ffc107;
        }

        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          cursor: grab;
          font-size: 1.2rem;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .participant-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          background: #e3f2fd;
          color: #0277bd;
          border-radius: 50%;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .is-organizer .participant-number {
          background: #ffc107;
          color: #000;
        }

        .participant-name {
          flex: 1;
          color: #212529;
          font-size: 1rem;
          font-weight: 500;
        }

        .participant-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .participant-days {
          font-size: 0.85rem;
          color: #6c757d;
          background: #f1f3f5;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .btn-organizer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          background: white;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .btn-organizer:hover {
          border-color: #ffc107;
          background: #fff9e6;
          color: #ffc107;
        }

        .btn-organizer.active {
          border-color: #ffc107;
          background: #ffc107;
          color: #000;
        }

        .btn-split {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          background: white;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .btn-split:hover {
          border-color: #007bff;
          background: #f0f8ff;
          color: #007bff;
        }

        .add-absent-fixed {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          margin-bottom: 15px;
        }
        .add-absent-fixed input {
          padding: 8px;
          border: 1px solid #dee2e6;
          border-radius: 6px;
        }

        .btn-split {
          padding: 8px 12px;
          border: 2px solid #dee2e6;
          border-radius: 6px;
          background: white;
          color: #6c757d;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .btn-split:hover {
          border-color: #007bff;
          background: #f0f8ff;
          color: #007bff;
        }

        .organizer-label {
          font-weight: 600;
          font-size: 0.85rem;
        }

        .actions {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background: #545b62;
        }

        @media (max-width: 768px) {
          .full-course-participant-editor {
            padding: 20px 15px;
          }

          .header-content h2 {
            font-size: 1.5rem;
          }

          .course-summary {
            flex-direction: column;
            gap: 10px;
          }

          .sortable-participant-item {
            flex-wrap: wrap;
            gap: 8px;
          }

          .participant-info {
            width: 100%;
            order: 3;
          }

          .btn-organizer {
            flex: 1;
            justify-content: center;
          }

          .actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }

        .sortable-participant-item.merge-mode { cursor: pointer; }
        .sortable-participant-item.is-selected { border-color: #007bff; background: #f0f8ff; }
        .sortable-participant-item.is-main { border-color: #28a745; background: #e6ffed; }
        .drag-disabled { opacity: 0.5; cursor: not-allowed; }

        .merge-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
        }
      `}</style>
    </div>
  );
};
