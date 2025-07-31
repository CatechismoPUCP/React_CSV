import React, { useState } from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { MdDragIndicator } from 'react-icons/md';
import { FiClock, FiCheckCircle, FiXCircle, FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiUsers } from 'react-icons/fi';
import { ConnectionsLog } from './ConnectionsLog';

interface ParticipantEditorProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  lessonType: LessonType;
  lessonDate: Date;
}

interface ParticipantItemProps {
  participant: ProcessedParticipant;
  index: number;
  totalCount: number;
  lessonType: LessonType;
  onTogglePresence: (index: number) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onMergeWith: (targetIndex: number, sourceIndex: number) => void;
  mergeMode: boolean;
  selectedForMerge: number | null;
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
  onMergeWith,
  mergeMode,
  selectedForMerge,
}) => {
  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isMergeTarget = mergeMode && selectedForMerge === index;
  const canMergeWith = mergeMode && selectedForMerge !== null && selectedForMerge !== index;

  return (
    <div className={`participant-item ${index < 5 ? 'included' : 'excluded'} ${
      isMergeTarget ? 'merge-target' : ''
    } ${canMergeWith ? 'merge-candidate' : ''}`}
    onClick={canMergeWith ? () => onMergeWith(selectedForMerge!, index) : undefined}
    style={{ cursor: canMergeWith ? 'pointer' : 'default' }}>
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

        {mergeMode ? (
          <button
            className={`merge-button ${isMergeTarget ? 'selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isMergeTarget) {
                // Deselect if already selected
                onMergeWith(-1, index);
              } else {
                // Select as merge target
                onMergeWith(index, -1);
              }
            }}
            title={isMergeTarget ? 'Deseleziona' : 'Seleziona come destinazione merge'}
          >
            <FiUsers size={16} />
            {isMergeTarget ? 'Destinazione' : 'Seleziona'}
          </button>
        ) : (
          <button
            className="remove-participant"
            onClick={() => onRemove(index)}
            title="Rimuovi partecipante"
          >
            <FiTrash2 size={16} />
          </button>
        )}
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
  organizer,
  onParticipantsChange,
  lessonType,
  lessonDate = new Date()
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showConnectionsLog, setShowConnectionsLog] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<number | null>(null);

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
      isAbsent: true, // Explicitly mark as absent
      allConnections: {
        morning: [],
        afternoon: []
      },
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

  const handleMergeWith = (targetIndex: number, sourceIndex: number) => {
    if (targetIndex === -1) {
      // Deselect
      setSelectedForMerge(null);
      return;
    }
    
    if (sourceIndex === -1) {
      // Select target
      setSelectedForMerge(targetIndex);
      return;
    }
    
    // Perform merge
    const updated = [...participants];
    const targetParticipant = updated[targetIndex];
    const sourceParticipant = updated[sourceIndex];
    
    // Create alias list for the target participant
    if (!targetParticipant.aliases) {
      targetParticipant.aliases = [];
    }
    
    // Add source participant as alias with its connection list
    const sourceConnectionsList = formatParticipantConnections(sourceParticipant, lessonType);
    targetParticipant.aliases.push({
      name: sourceParticipant.name,
      connectionsList: sourceConnectionsList
    });
    
    // Merge all connections from source into target participant
    targetParticipant.allConnections.morning.push(...sourceParticipant.allConnections.morning);
    targetParticipant.sessions.morning.push(...sourceParticipant.sessions.morning);
    targetParticipant.allConnections.afternoon.push(...sourceParticipant.allConnections.afternoon);
    targetParticipant.sessions.afternoon.push(...sourceParticipant.sessions.afternoon);
    
    // Sort connections by time
    targetParticipant.allConnections.morning.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
    targetParticipant.allConnections.afternoon.sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
    
    // Recalculate first join and last leave times
    if (targetParticipant.allConnections.morning.length > 0) {
      targetParticipant.morningFirstJoin = targetParticipant.allConnections.morning[0].joinTime;
      targetParticipant.morningLastLeave = targetParticipant.allConnections.morning[targetParticipant.allConnections.morning.length - 1].leaveTime;
    }
    
    if (targetParticipant.allConnections.afternoon.length > 0) {
      targetParticipant.afternoonFirstJoin = targetParticipant.allConnections.afternoon[0].joinTime;
      targetParticipant.afternoonLastLeave = targetParticipant.allConnections.afternoon[targetParticipant.allConnections.afternoon.length - 1].leaveTime;
    }
    
    // Remove source participant
    updated.splice(sourceIndex, 1);
    
    // Reset merge mode
    setMergeMode(false);
    setSelectedForMerge(null);
    
    onParticipantsChange(updated);
  };
  
  const formatParticipantConnections = (participant: ProcessedParticipant, lessonType: LessonType): string => {
    const connections: string[] = [];
    
    // Morning connections
    if (lessonType !== 'afternoon' && participant.allConnections.morning.length > 0) {
      const morningTimes = participant.allConnections.morning
        .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
        .join('; ');
      connections.push(morningTimes);
    }
    
    // Afternoon connections
    if (lessonType !== 'morning' && participant.allConnections.afternoon.length > 0) {
      const afternoonTimes = participant.allConnections.afternoon
        .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
        .join('; ');
      connections.push(afternoonTimes);
    }
    
    return connections.join(' | ');
  };
  
  const formatTimeWithSeconds = (date: Date): string => {
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="participant-editor">
      {organizer && (
        <div className="organizer-section">
          <div className="section-header">
            <h3>Organizzatore</h3>
            <p className="section-description">
              L'organizzatore è automaticamente escluso dalla lista dei partecipanti.
            </p>
          </div>
          <div className="organizer-info">
            <div className="organizer-name">
              <strong>{organizer.name}</strong>
              {organizer.email && <span className="email">({organizer.email})</span>}
            </div>
            <div className="organizer-times">
              {lessonType !== 'afternoon' && organizer.morningFirstJoin && (
                <div className="time-info">
                  <span className="time-label">Mattina:</span>
                  <span className="time-value">
                    {formatTime(organizer.morningFirstJoin)} - {formatTime(organizer.morningLastLeave)}
                  </span>
                </div>
              )}
              {lessonType !== 'morning' && organizer.afternoonFirstJoin && (
                <div className="time-info">
                  <span className="time-label">Pomeriggio:</span>
                  <span className="time-value">
                    {formatTime(organizer.afternoonFirstJoin)} - {formatTime(organizer.afternoonLastLeave)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="section-header">
        <h3>Partecipanti Trovati ({participants.length})</h3>
        <p className="section-description">
          Usa le frecce per riordinare i partecipanti. Solo i primi 5 saranno inclusi nel registro.
          <br />
          <strong>Nota:</strong> La presenza è valida per un massimo di 15 minuti di assenza consecutiva.
        </p>
        <div className="section-actions">
          <button 
            className={`action-btn ${mergeMode ? 'active' : ''}`}
            onClick={() => {
              setMergeMode(!mergeMode);
              setSelectedForMerge(null);
            }}
          >
            <FiUsers size={16} />
            {mergeMode ? 'Annulla Merge' : 'Unisci Partecipanti'}
          </button>
          <button 
            className="action-btn"
            onClick={() => setShowConnectionsLog(!showConnectionsLog)}
          >
            {showConnectionsLog ? 'Nascondi' : 'Mostra'} Registro Connessioni
          </button>
        </div>
      </div>

      {mergeMode && (
        <div className="merge-instructions">
          <p>🔄 <strong>Modalità Unione Attiva:</strong></p>
          <p>1. Clicca "Seleziona" sul partecipante principale (destinazione)</p>
          <p>2. Clicca su un altro partecipante per unirlo al principale</p>
          <p>3. Tutte le connessioni verranno unite e salvate nel documento</p>
        </div>
      )}

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
            onMergeWith={handleMergeWith}
            mergeMode={mergeMode}
            selectedForMerge={selectedForMerge}
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

      {showConnectionsLog && (
        <ConnectionsLog
          participants={participants}
          organizer={organizer}
          lessonType={lessonType}
          lessonDate={lessonDate}
        />
      )}
    </div>
  );
};
