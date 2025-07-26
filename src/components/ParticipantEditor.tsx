import React, { useState } from 'react';
import { ProcessedParticipant } from '../types';
import { MdDragIndicator } from 'react-icons/md';
import { FiClock, FiCheckCircle, FiXCircle, FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';

interface ParticipantEditorProps {
  participants: ProcessedParticipant[];
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  lessonType: 'morning' | 'afternoon' | 'both';
}

interface ParticipantItemProps {
  participant: ProcessedParticipant;
  index: number;
  totalCount: number;
  lessonType: 'morning' | 'afternoon' | 'both';
  onTogglePresence: (index: number) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  index,
  totalCount,
  lessonType,
  onTogglePresence,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`participant-item ${index < 5 ? 'included' : 'excluded'}`}>
      <div className="participant-controls">
        <span className="participant-number">#{index + 1}</span>
        <div className="move-buttons">
          <button
            className="move-button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            title="Sposta su"
          >
            <FiArrowUp size={14} />
          </button>
          <button
            className="move-button"
            onClick={() => onMoveDown(index)}
            disabled={index === totalCount - 1}
            title="Sposta giù"
          >
            <FiArrowDown size={14} />
          </button>
        </div>
      </div>

      <div className="participant-info">
        <div className="participant-name">{participant.name}</div>
        <div className="participant-details">
          {lessonType !== 'afternoon' && (
            <div className="session-info">
              <span className="session-label">Mattina:</span>
              <span className="session-times">
                {formatTime(participant.morningFirstJoin)} - {formatTime(participant.morningLastLeave)}
              </span>
            </div>
          )}
          {lessonType !== 'morning' && (
            <div className="session-info">
              <span className="session-label">Pomeriggio:</span>
              <span className="session-times">
                {formatTime(participant.afternoonFirstJoin)} - {formatTime(participant.afternoonLastLeave)}
              </span>
            </div>
          )}
          <div className="absence-info">
            <FiClock size={14} />
            <span>Assenze: {participant.totalAbsenceMinutes} min</span>
          </div>
        </div>
      </div>

      <div className="participant-actions">
        <button
          className={`presence-toggle ${participant.isPresent ? 'present' : 'absent'}`}
          onClick={() => onTogglePresence(index)}
          title={participant.isPresent ? 'Segna come assente' : 'Segna come presente'}
        >
          {participant.isPresent ? (
            <>
              <FiCheckCircle size={16} />
              <span>Presente</span>
            </>
          ) : (
            <>
              <FiXCircle size={16} />
              <span>Assente</span>
            </>
          )}
        </button>

        <button
          className="remove-participant"
          onClick={() => onRemove(index)}
          title="Rimuovi partecipante"
        >
          <FiTrash2 size={16} />
        </button>
      </div>

      {index >= 5 && (
        <div className="excluded-badge">
          Non incluso nel registro
        </div>
      )}
    </div>
  );
};

export const ParticipantEditor: React.FC<ParticipantEditorProps> = ({
  participants,
  onParticipantsChange,
  lessonType
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');

  const moveParticipantUp = (index: number) => {
    if (index > 0) {
      const newParticipants = [...participants];
      [newParticipants[index], newParticipants[index - 1]] = [newParticipants[index - 1], newParticipants[index]];
      onParticipantsChange(newParticipants);
    }
  };

  const moveParticipantDown = (index: number) => {
    if (index < participants.length - 1) {
      const newParticipants = [...participants];
      [newParticipants[index], newParticipants[index + 1]] = [newParticipants[index + 1], newParticipants[index]];
      onParticipantsChange(newParticipants);
    }
  };

  const addManualParticipant = () => {
    if (!newParticipantName.trim()) return;

    const newParticipant: ProcessedParticipant = {
      name: newParticipantName.trim(),
      email: '',
      totalAbsenceMinutes: 999, // Mark as absent by default
      isPresent: false,
      sessions: {
        morning: [],
        afternoon: []
      }
    };

    onParticipantsChange([...participants, newParticipant]);
    setNewParticipantName('');
  };

  const removeParticipant = (index: number) => {
    const updated = participants.filter((_, i) => i !== index);
    onParticipantsChange(updated);
  };

  const toggleParticipantPresence = (index: number) => {
    const updated = [...participants];
    updated[index] = {
      ...updated[index],
      isPresent: !updated[index].isPresent,
      totalAbsenceMinutes: updated[index].isPresent ? 999 : 0
    };
    onParticipantsChange(updated);
  };

  return (
    <div className="participant-editor">
      <div className="section-header">
        <h3>Partecipanti Trovati ({participants.length})</h3>
        <p className="section-description">
          Usa le frecce per riordinare i partecipanti. Solo i primi 5 saranno inclusi nel registro.
        </p>
      </div>

      <div className="participants-list">
        {participants.map((participant, index) => (
          <ParticipantItem
            key={participant.name}
            participant={participant}
            index={index}
            totalCount={participants.length}
            lessonType={lessonType}
            onTogglePresence={toggleParticipantPresence}
            onRemove={removeParticipant}
            onMoveUp={moveParticipantUp}
            onMoveDown={moveParticipantDown}
          />
        ))}
      </div>

      <div className="add-participant">
        <div className="add-participant-input">
          <input
            type="text"
            placeholder="Nome partecipante assente..."
            value={newParticipantName}
            onChange={(e) => setNewParticipantName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addManualParticipant()}
          />
          <button onClick={addManualParticipant} disabled={!newParticipantName.trim()}>
            <FiPlus size={16} />
            Aggiungi Assente
          </button>
        </div>
      </div>
    </div>
  );
};
