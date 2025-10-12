import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns';
import { it } from 'date-fns/locale';
import { LessonSchedule, SessionInfo } from '../../../types/course';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import 'react-calendar/dist/Calendar.css';

interface ScheduleCalendarProps {
  startDate: string;
  endDate: string;
  schedule: LessonSchedule[];
  onScheduleChange: (schedule: LessonSchedule[]) => void;
  isLoading?: boolean;
}

interface LessonFormData {
  date: string;
  lessonType: 'online' | 'presence' | 'hybrid';
  subject: string;
  sessions: {
    morning?: SessionInfo;
    afternoon?: SessionInfo;
  };
}

const defaultMorningSessions: SessionInfo = {
  startTime: '09:00',
  endTime: '13:00',
  duration: 240,
};

const defaultAfternoonSessions: SessionInfo = {
  startTime: '14:00',
  endTime: '18:00',
  duration: 240,
};

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  startDate,
  endDate,
  schedule,
  onScheduleChange,
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonFormData | null>(null);
  const [showForm, setShowForm] = useState(false);

  const courseDates = startDate && endDate 
    ? eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    : [];

  const getScheduleForDate = (date: string): LessonSchedule | undefined => {
    return schedule.find(s => s.date === date);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    
    const existingLesson = getScheduleForDate(dateStr);
    if (existingLesson) {
      setEditingLesson({
        date: dateStr,
        lessonType: existingLesson.lessonType,
        subject: existingLesson.subject || '',
        sessions: existingLesson.sessions,
      });
    } else {
      setEditingLesson({
        date: dateStr,
        lessonType: 'online',
        subject: '',
        sessions: {},
      });
    }
    setShowForm(true);
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;

    const newLesson: LessonSchedule = {
      date: editingLesson.date,
      lessonType: editingLesson.lessonType,
      subject: editingLesson.subject,
      sessions: editingLesson.sessions,
    };

    const updatedSchedule = schedule.filter(s => s.date !== editingLesson.date);
    updatedSchedule.push(newLesson);
    updatedSchedule.sort((a, b) => a.date.localeCompare(b.date));

    onScheduleChange(updatedSchedule);
    setShowForm(false);
    setEditingLesson(null);
  };

  const handleDeleteLesson = (date: string) => {
    const updatedSchedule = schedule.filter(s => s.date !== date);
    onScheduleChange(updatedSchedule);
    setShowForm(false);
    setEditingLesson(null);
  };

  const handleAddMorningSession = () => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      sessions: {
        ...editingLesson.sessions,
        morning: editingLesson.sessions.morning || defaultMorningSessions,
      },
    });
  };

  const handleAddAfternoonSession = () => {
    if (!editingLesson) return;
    setEditingLesson({
      ...editingLesson,
      sessions: {
        ...editingLesson.sessions,
        afternoon: editingLesson.sessions.afternoon || defaultAfternoonSessions,
      },
    });
  };

  const handleRemoveSession = (sessionType: 'morning' | 'afternoon') => {
    if (!editingLesson) return;
    const newSessions = { ...editingLesson.sessions };
    delete newSessions[sessionType];
    setEditingLesson({
      ...editingLesson,
      sessions: newSessions,
    });
  };

  const updateSessionTime = (sessionType: 'morning' | 'afternoon', field: 'startTime' | 'endTime', value: string) => {
    if (!editingLesson || !editingLesson.sessions[sessionType]) return;

    const session = editingLesson.sessions[sessionType]!;
    const updatedSession = { ...session, [field]: value };
    
    // Calculate duration
    if (updatedSession.startTime && updatedSession.endTime) {
      const start = new Date(`2000-01-01T${updatedSession.startTime}:00`);
      const end = new Date(`2000-01-01T${updatedSession.endTime}:00`);
      updatedSession.duration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
    }

    setEditingLesson({
      ...editingLesson,
      sessions: {
        ...editingLesson.sessions,
        [sessionType]: updatedSession,
      },
    });
  };

  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const lesson = getScheduleForDate(dateStr);
    
    if (!courseDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)) {
      return 'outside-course';
    }
    
    if (lesson) {
      return `has-lesson lesson-${lesson.lessonType}`;
    }
    
    if (isWeekend(date)) {
      return 'weekend';
    }
    
    return 'course-day';
  };

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const lesson = getScheduleForDate(dateStr);
    
    if (lesson) {
      const sessionCount = Object.keys(lesson.sessions).length;
      return (
        <div className="lesson-indicator">
          <span className="session-count">{sessionCount}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        <h3>Calendario Lezioni</h3>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color online"></div>
            <span>Online</span>
          </div>
          <div className="legend-item">
            <div className="legend-color presence"></div>
            <span>Presenza</span>
          </div>
          <div className="legend-item">
            <div className="legend-color hybrid"></div>
            <span>Ibrido</span>
          </div>
        </div>
      </div>

      <div className="calendar-container">
        <Calendar
          onChange={() => {}}
          onClickDay={handleDateClick}
          value={selectedDate}
          locale="it-IT"
          tileClassName={tileClassName}
          tileContent={tileContent}
          minDate={startDate ? parseISO(startDate) : undefined}
          maxDate={endDate ? parseISO(endDate) : undefined}
        />
      </div>

      {showForm && editingLesson && (
        <div className="lesson-form-overlay">
          <div className="lesson-form">
            <div className="form-header">
              <h4>
                {getScheduleForDate(editingLesson.date) ? 'Modifica' : 'Aggiungi'} Lezione
              </h4>
              <span className="lesson-date">
                {format(parseISO(editingLesson.date), 'EEEE d MMMM yyyy', { locale: it })}
              </span>
            </div>

            <div className="form-content">
              <div className="form-group">
                <label>Tipo Lezione</label>
                <select
                  value={editingLesson.lessonType}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    lessonType: e.target.value as 'online' | 'presence' | 'hybrid'
                  })}
                >
                  <option value="online">Online</option>
                  <option value="presence">Presenza</option>
                  <option value="hybrid">Ibrido</option>
                </select>
              </div>

              <div className="form-group">
                <label>Argomento</label>
                <input
                  type="text"
                  value={editingLesson.subject}
                  onChange={(e) => setEditingLesson({
                    ...editingLesson,
                    subject: e.target.value
                  })}
                  placeholder="Argomento della lezione"
                />
              </div>

              <div className="sessions-section">
                <h5>Sessioni</h5>
                
                {/* Morning Session */}
                {editingLesson.sessions.morning ? (
                  <div className="session-form">
                    <div className="session-header">
                      <span>Mattina</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSession('morning')}
                        className="btn-remove"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={editingLesson.sessions.morning.startTime}
                        onChange={(e) => updateSessionTime('morning', 'startTime', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={editingLesson.sessions.morning.endTime}
                        onChange={(e) => updateSessionTime('morning', 'endTime', e.target.value)}
                      />
                      <span className="duration">
                        ({editingLesson.sessions.morning.duration} min)
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddMorningSession}
                    className="btn-add-session"
                  >
                    <FiPlus /> Aggiungi Sessione Mattina
                  </button>
                )}

                {/* Afternoon Session */}
                {editingLesson.sessions.afternoon ? (
                  <div className="session-form">
                    <div className="session-header">
                      <span>Pomeriggio</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSession('afternoon')}
                        className="btn-remove"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={editingLesson.sessions.afternoon.startTime}
                        onChange={(e) => updateSessionTime('afternoon', 'startTime', e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={editingLesson.sessions.afternoon.endTime}
                        onChange={(e) => updateSessionTime('afternoon', 'endTime', e.target.value)}
                      />
                      <span className="duration">
                        ({editingLesson.sessions.afternoon.duration} min)
                      </span>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddAfternoonSession}
                    className="btn-add-session"
                  >
                    <FiPlus /> Aggiungi Sessione Pomeriggio
                  </button>
                )}
              </div>
            </div>

            <div className="form-actions">
              {getScheduleForDate(editingLesson.date) && (
                <button
                  type="button"
                  onClick={() => handleDeleteLesson(editingLesson.date)}
                  className="btn btn-danger"
                >
                  <FiTrash2 /> Elimina
                </button>
              )}
              <div className="action-group">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSaveLesson}
                  className="btn btn-primary"
                  disabled={Object.keys(editingLesson.sessions).length === 0}
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
