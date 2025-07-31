import React, { useState } from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { FiPlus, FiEye, FiEyeOff } from 'react-icons/fi';
import { ConnectionsLog } from './ConnectionsLog';
import { ParticipantItem, MergeControls, ParticipantStats } from './participant';
import { useParticipantManagement } from '../hooks/useParticipantManagement';

interface ParticipantEditorProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  lessonType: LessonType;
  lessonDate: Date;
}

export const ParticipantEditor: React.FC<ParticipantEditorProps> = ({
  participants,
  organizer,
  onParticipantsChange,
  lessonType,
  lessonDate = new Date()
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showConnectionsLog, setShowConnectionsLog] = useState(false);

  const {
    mergeMode,
    selectedForMerge,
    togglePresence,
    removeParticipant,
    moveUp,
    moveDown,
    toggleMergeMode,
    cancelMerge,
    handleMergeSelection,
  } = useParticipantManagement(participants, onParticipantsChange);

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



  return (
    <div className="participant-editor">
      <div className="editor-header">
        <h3>Gestione Partecipanti</h3>
        <ParticipantStats participants={participants} organizer={organizer} />
      </div>

      <div className="editor-controls">
        <MergeControls
          mergeMode={mergeMode}
          selectedForMerge={selectedForMerge}
          participantCount={participants.length}
          onToggleMergeMode={toggleMergeMode}
          onCancelMerge={cancelMerge}
        />

        <div className="view-controls">
          <button
            onClick={() => setShowConnectionsLog(!showConnectionsLog)}
            className={`toggle-btn ${showConnectionsLog ? 'active' : ''}`}
            title="Mostra/Nascondi log connessioni"
          >
            {showConnectionsLog ? <FiEyeOff /> : <FiEye />}
            Log Connessioni
          </button>
        </div>
      </div>

      <div className="participants-list">
        {participants.map((participant, index) => (
          <ParticipantItem
            key={`${participant.name}-${index}`}
            participant={participant}
            index={index}
            totalCount={participants.length}
            lessonType={lessonType}
            onTogglePresence={togglePresence}
            onRemove={removeParticipant}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onMergeWith={handleMergeSelection}
            mergeMode={mergeMode}
            selectedForMerge={selectedForMerge}
          />
        ))}
      </div>

      <div className="add-participant">
        <div className="add-participant-form">
          <input
            type="text"
            value={newParticipantName}
            onChange={(e) => setNewParticipantName(e.target.value)}
            placeholder="Nome nuovo partecipante"
            onKeyPress={(e) => e.key === 'Enter' && addManualParticipant()}
            className="participant-input"
          />
          <button
            onClick={addManualParticipant}
            disabled={!newParticipantName.trim()}
            className="add-btn"
            title="Aggiungi partecipante manualmente"
          >
            <FiPlus />
            Aggiungi
          </button>
        </div>
        <p className="add-participant-note">
          Aggiungi partecipanti che non compaiono nei file CSV
        </p>
      </div>

      {showConnectionsLog && (
        <ConnectionsLog
          participants={participants}
          organizer={organizer}
          lessonType={lessonType}
          lessonDate={lessonDate}
        />
      )}

      <div className="absence-notice">
        <p>
          <strong>Nota:</strong> Assenze superiori a 15 minuti devono essere giustificate secondo il regolamento.
        </p>
      </div>
    </div>
  );
};
