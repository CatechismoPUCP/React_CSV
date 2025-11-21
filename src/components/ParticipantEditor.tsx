import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ProcessedParticipant, LessonType } from '../types';
import { FiPlus, FiEye, FiEyeOff } from 'react-icons/fi';
import { ConnectionsLog } from './ConnectionsLog';
import { ParticipantItem, MergeControls, ParticipantStats } from './participant';
import { useParticipantManagement } from '../hooks/useParticipantManagement';

interface ParticipantEditorProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  onSetOrganizer: (index: number) => void;
  lessonType: LessonType;
  lessonDate: Date;
}

export const ParticipantEditor: React.FC<ParticipantEditorProps> = ({
  participants,
  organizer,
  onParticipantsChange,
  onSetOrganizer,
  lessonType,
  lessonDate = new Date()
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [showConnectionsLog, setShowConnectionsLog] = useState(false);

  const {
    mergeMode,
    selectedForMerge,
    selectedSources,
    togglePresence,
    removeParticipant,
    toggleMergeMode,
    cancelMerge,
    handleMergeSelection,
    confirmMerge,
  } = useParticipantManagement(participants, onParticipantsChange);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Extract indices from IDs
    const activeIndex = parseInt(active.id.toString().replace('participant-', ''));
    const overIndex = parseInt(over.id.toString().replace('participant-', ''));

    const reorderedParticipants = arrayMove(participants, activeIndex, overIndex);
    onParticipantsChange(reorderedParticipants);
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

  return (
    <div className="participant-editor">
      <div className="editor-header">
        <h3>Gestione Partecipanti</h3>
        <ParticipantStats participants={participants} organizer={organizer} />
      </div>

      {organizer && (
        <div className="organizer-section">
          <h4>Organizzatore</h4>
          <div className="organizer-card">
            <span className="participant-name">{organizer.name}</span>
            <span className="organizer-badge">Organizzatore</span>
          </div>
        </div>
      )}

      <div className="editor-controls">
        <MergeControls
          mergeMode={mergeMode}
          selectedForMerge={selectedForMerge}
          participantCount={participants.length}
          onToggleMergeMode={toggleMergeMode}
          onCancelMerge={cancelMerge}
          onConfirmMerge={confirmMerge}
          canConfirm={Boolean(selectedForMerge !== null && selectedSources.size >= 1)}
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
              <ParticipantItem
                key={`${participant.name}-${index}`}
                participant={participant}
                index={index}
                totalCount={participants.length}
                lessonType={lessonType}
                onTogglePresence={togglePresence}
                onRemove={removeParticipant}
                onMergeWith={handleMergeSelection}
                mergeMode={mergeMode}
                selectedForMerge={selectedForMerge}
                onSetOrganizer={onSetOrganizer}
                isDragEnabled={!mergeMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {participants.length > 0 && (
        <div className="drag-and-drop-hint" style={{
          padding: '12px',
          background: '#e3f2fd',
          borderRadius: '6px',
          marginTop: '12px',
          textAlign: 'center',
          color: '#1565c0',
          fontSize: '0.9rem'
        }}>
          💡 <strong>Trascina i partecipanti</strong> usando l'icona <FiPlus style={{transform: 'rotate(45deg)', display: 'inline-block'}} /> per riordinarli velocemente
        </div>
      )}

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
