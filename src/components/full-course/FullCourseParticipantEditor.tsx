import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ParsedFullCourseData, FullCourseParticipantInfo } from '../../types/course';
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
}

const SortableParticipantItem: React.FC<SortableParticipantItemProps> = ({
  participant,
  index,
  isOrganizer,
  onSetOrganizer,
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
      className={`sortable-participant-item ${isOrganizer ? 'is-organizer' : ''}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
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
      >
        <FiStar />
        {isOrganizer && <span className="organizer-label">Organizzatore</span>}
      </button>
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

  const handleComplete = () => {
    // Create updated data with participant order and organizer info
    const updatedParticipants = participants.map((p, idx) => ({
      ...p,
      masterOrder: idx,
      isOrganizer: idx === organizerIndex,
    }));

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
      </div>

      <div className="info-box">
        <p>
          <strong>💡 Ordine Globale:</strong> L'ordine che definisci qui verrà usato per tutti i giorni del corso.
          L'organizzatore non apparirà nella lista presenze dei documenti Word.
        </p>
      </div>

      <div className="participants-container">
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
        <button onClick={handleComplete} className="btn btn-primary">
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
      `}</style>
    </div>
  );
};
