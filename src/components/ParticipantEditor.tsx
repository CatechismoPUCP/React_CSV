import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ProcessedParticipant } from '../types';
import { MdDragIndicator } from 'react-icons/md';
import { FiClock, FiCheckCircle, FiXCircle, FiPlus, FiTrash2 } from 'react-icons/fi';

interface ParticipantEditorProps {
  participants: ProcessedParticipant[];
  onParticipantsChange: (participants: ProcessedParticipant[]) => void;
  lessonType: 'morning' | 'afternoon' | 'both';
}

export const ParticipantEditor: React.FC<ParticipantEditorProps> = ({
  participants,
  onParticipantsChange,
  lessonType
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(participants);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onParticipantsChange(items);
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

  const formatTime = (date?: Date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="participant-editor">
      <div className="section-header">
        <h3>Partecipanti Trovati ({participants.length})</h3>
        <p className="section-description">
          Riordina i partecipanti trascinandoli. Solo i primi 5 saranno inclusi nel registro.
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="participants">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="participants-list"
            >
              {participants.map((participant, index) => (
                <Draggable
                  key={participant.name}
                  draggableId={participant.name}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`participant-item ${snapshot.isDragging ? 'dragging' : ''} ${index < 5 ? 'included' : 'excluded'}`}
                    >
                      <div className="participant-drag-handle" {...provided.dragHandleProps}>
                        <MdDragIndicator size={16} />
                        <span className="participant-number">#{index + 1}</span>
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
                          onClick={() => toggleParticipantPresence(index)}
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
                          onClick={() => removeParticipant(index)}
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
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

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
