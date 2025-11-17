import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ParsedFullCourseData } from '../../types/course';
import { FiMove, FiChevronDown, FiChevronRight, FiUsers, FiCalendar, FiCheck } from 'react-icons/fi';

interface FullCourseParticipantEditorProps {
  parsedData: ParsedFullCourseData;
  onComplete: (updatedData: ParsedFullCourseData) => void;
  onBack: () => void;
}

interface DayParticipantList {
  date: string;
  participants: string[];
}

interface SortableParticipantItemProps {
  participant: string;
  index: number;
}

const SortableParticipantItem: React.FC<SortableParticipantItemProps> = ({ participant, index }) => {
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
      className="sortable-participant-item"
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <FiMove />
      </div>
      <span className="participant-number">#{index + 1}</span>
      <span className="participant-name">{participant}</span>
    </div>
  );
};

export const FullCourseParticipantEditor: React.FC<FullCourseParticipantEditorProps> = ({
  parsedData,
  onComplete,
  onBack,
}) => {
  // Initialize participant lists for each day
  const [dayParticipants, setDayParticipants] = useState<DayParticipantList[]>(() => {
    return parsedData.days.map(day => ({
      date: day.date,
      participants: Array.from(day.participantNames).sort(),
    }));
  });

  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(parsedData.days.map(d => d.date))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const handleDragEnd = (dayDate: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dayIndex = dayParticipants.findIndex(d => d.date === dayDate);
    if (dayIndex === -1) return;

    const activeIndex = parseInt(active.id.toString().replace('participant-', ''));
    const overIndex = parseInt(over.id.toString().replace('participant-', ''));

    const newDayParticipants = [...dayParticipants];
    newDayParticipants[dayIndex] = {
      ...newDayParticipants[dayIndex],
      participants: arrayMove(newDayParticipants[dayIndex].participants, activeIndex, overIndex),
    };

    setDayParticipants(newDayParticipants);
  };

  const handleComplete = () => {
    // Create updated data with participant order
    const updatedData = {
      ...parsedData,
      days: parsedData.days.map((day, index) => ({
        ...day,
        participantOrder: dayParticipants[index]?.participants || Array.from(day.participantNames),
      })),
    };

    onComplete(updatedData);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="full-course-participant-editor">
      <div className="editor-header">
        <div className="header-content">
          <h2>Ordina Partecipanti</h2>
          <p className="subtitle">
            Trascina i partecipanti per definire l'ordine nel documento Word
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

      <div className="days-list">
        {parsedData.days.map((day, dayIndex) => {
          const participants = dayParticipants.find(d => d.date === day.date)?.participants || [];
          const isExpanded = expandedDays.has(day.date);

          return (
            <div key={day.date} className="day-card">
              <div className="day-header" onClick={() => toggleDay(day.date)}>
                <div className="day-header-left">
                  {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                  <span className="day-date">{formatDate(day.date)}</span>
                </div>
                <div className="day-header-right">
                  <span className="participant-count">
                    {participants.length} partecipanti
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="day-content">
                  <div className="drag-hint">
                    💡 Trascina per riordinare - l'ordine sarà usato nel documento Word
                  </div>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(day.date)}
                  >
                    <SortableContext
                      items={participants.map((_, index) => `participant-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="participants-list">
                        {participants.map((participant, index) => (
                          <SortableParticipantItem
                            key={`${participant}-${index}`}
                            participant={participant}
                            index={index}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          );
        })}
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
          margin-bottom: 30px;
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

        .days-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 30px;
        }

        .day-card {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: hidden;
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          background: #f8f9fa;
          transition: background-color 0.2s;
        }

        .day-header:hover {
          background: #e9ecef;
        }

        .day-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .day-date {
          font-weight: 600;
          color: #212529;
          text-transform: capitalize;
        }

        .participant-count {
          color: #6c757d;
          font-size: 0.9rem;
        }

        .day-content {
          padding: 20px;
          border-top: 1px solid #dee2e6;
        }

        .drag-hint {
          margin-bottom: 15px;
          padding: 12px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #856404;
        }

        .participants-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sortable-participant-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          cursor: move;
          transition: all 0.2s;
        }

        .sortable-participant-item:hover {
          background: #f8f9fa;
          border-color: #007bff;
        }

        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
          cursor: grab;
          font-size: 1.1rem;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .participant-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          background: #e3f2fd;
          color: #0277bd;
          border-radius: 50%;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .participant-name {
          flex: 1;
          color: #212529;
          font-size: 0.95rem;
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
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
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
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
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

          .day-header {
            padding: 12px 15px;
          }

          .day-content {
            padding: 15px;
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
