import React from 'react';
import { ProcessedParticipant, LessonType } from '../../types';
import { FiClock, FiCheckCircle, FiXCircle, FiTrash2, FiUserCheck, FiMove } from 'react-icons/fi';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ParticipantItemProps {
  participant: ProcessedParticipant;
  index: number;
  totalCount: number;
  lessonType: LessonType;
  onTogglePresence: (index: number) => void;
  onRemove: (index: number) => void;
  onMergeWith: (index: number) => void;
  mergeMode: boolean;
  selectedForMerge: number | null;
  onSetOrganizer: (index: number) => void;
  isDragEnabled?: boolean;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  index,
  totalCount,
  lessonType,
  onTogglePresence,
  onRemove,
  onMergeWith,
  mergeMode,
  selectedForMerge,
  onSetOrganizer,
  isDragEnabled = true,
}) => {
  // Create a unique ID for drag and drop
  const itemId = `participant-${index}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: itemId,
    disabled: !isDragEnabled || mergeMode, // Disable drag during merge mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMergeTarget = mergeMode && selectedForMerge === index;
  const isMergeCandidate = mergeMode && selectedForMerge === null;
  const isMergeSource = mergeMode && selectedForMerge !== null && selectedForMerge !== index;

  const handleItemClick = () => {
    if (mergeMode) {
      onMergeWith(index);
    }
  };

  const formatConnectionTimes = (connections: Array<{ joinTime: Date; leaveTime: Date; }>) => {
    if (!connections || connections.length === 0) return 'Nessuna connessione';
    
    return connections.map(conn => {
      const joinTime = conn.joinTime.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      const leaveTime = conn.leaveTime.toLocaleTimeString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      return `${joinTime} - ${leaveTime}`;
    }).join('; ');
  };

  const formatAliasConnections = () => {
    if (!participant.aliases || participant.aliases.length === 0) return null;
    
    return participant.aliases.map(alias => (
      <div key={alias.name} className="alias-connections">
        <strong>{alias.name}:</strong> {alias.connectionsList}
      </div>
    ));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`participant-item ${isMergeTarget ? 'merge-target' : ''} ${isMergeCandidate ? 'merge-candidate' : ''} ${isMergeSource ? 'merge-source' : ''} ${isDragging ? 'is-dragging' : ''}`}
      onClick={handleItemClick}
    >
      <div className="participant-header">
        <div className="participant-info">
          <div
            className={`drag-handle ${!isDragEnabled || mergeMode ? 'drag-disabled' : ''}`}
            {...attributes}
            {...listeners}
            title={mergeMode ? 'Drag disabilitato durante merge' : 'Trascina per riordinare'}
          >
            <FiMove />
          </div>
          <span className="participant-order-badge">#{index + 1}</span>
          <span className="participant-name">{participant.name}</span>
          {participant.isOrganizer && (
            <span className="organizer-badge">Organizzatore</span>
          )}
        </div>

        <div className="participant-actions">
          {!participant.isOrganizer && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetOrganizer(index);
              }}
              className="organizer-set-btn"
              title="Imposta come Organizzatore"
            >
              <FiUserCheck />
              <span>Imposta organizzatore</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePresence(index);
            }}
            className={`presence-toggle ${participant.isPresent ? 'present' : 'absent'}`}
            title={participant.isPresent ? 'Segna come assente' : 'Segna come presente'}
          >
            {participant.isPresent ? <FiCheckCircle /> : <FiXCircle />}
            {participant.isPresent ? 'Presente' : 'Assente'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            className="remove-btn"
            title="Rimuovi partecipante"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      <div className="participant-details">
        <div className="connection-times">
          <FiClock className="icon" />
          <div className="times-info">
            <div className="main-connections">
              <strong>{participant.name}:</strong> {formatConnectionTimes([...participant.allConnections.morning, ...participant.allConnections.afternoon])}
            </div>
            {formatAliasConnections()}
          </div>
        </div>

        {(lessonType === 'morning' || lessonType === 'afternoon') && (
          <div className="session-times">
            {lessonType !== 'afternoon' && (
              <div className="session">
                <span className="session-label">Mattina:</span>
                <span className="time-range">
                  {formatTime(participant.morningFirstJoin)} - {formatTime(participant.morningLastLeave)}
                </span>
              </div>
            )}
            {lessonType !== 'morning' && (
              <div className="session">
                <span className="session-label">Pomeriggio:</span>
                <span className="time-range">
                  {formatTime(participant.afternoonFirstJoin)} - {formatTime(participant.afternoonLastLeave)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
