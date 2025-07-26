import React from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { FiClock, FiUser, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface AttendanceDashboardProps {
  participants: ProcessedParticipant[];
  lessonType: LessonType;
  lessonDate: Date;
}

interface HourBlock {
  hour: number;
  isPresent: boolean;
  isLessonHour: boolean;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  participants,
  lessonType,
  lessonDate
}) => {
  const getLessonHours = (): number[] => {
    switch (lessonType) {
      case 'morning':
        return [9, 10, 11, 12];
      case 'afternoon':
        return [14, 15, 16, 17];
      case 'both':
        return [9, 10, 11, 12, 14, 15, 16, 17];
      default:
        return [];
    }
  };

  const calculateHourlyAttendance = (participant: ProcessedParticipant): HourBlock[] => {
    const lessonHours = getLessonHours();
    const hourBlocks: HourBlock[] = [];

    // Initialize all possible hours (8-18)
    for (let hour = 8; hour <= 18; hour++) {
      hourBlocks.push({
        hour,
        isPresent: false,
        isLessonHour: lessonHours.includes(hour)
      });
    }

    // Helper function to check if participant was present during a specific hour
    const wasPresent = (targetHour: number, sessions: { joinTime: Date; leaveTime: Date }[]): boolean => {
      if (sessions.length === 0) return false;
      
      const hourStart = new Date(lessonDate);
      hourStart.setHours(targetHour, 0, 0, 0);
      const hourEnd = new Date(lessonDate);
      hourEnd.setHours(targetHour, 59, 59, 999);
      
      let totalPresenceMinutes = 0;
      
      sessions.forEach(session => {
        const sessionStart = new Date(Math.max(session.joinTime.getTime(), hourStart.getTime()));
        const sessionEnd = new Date(Math.min(session.leaveTime.getTime(), hourEnd.getTime()));
        
        if (sessionEnd > sessionStart) {
          totalPresenceMinutes += (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
        }
      });
      
      // Consider present if attended at least 30 minutes of the hour
      return totalPresenceMinutes >= 30;
    };
    
    // Check if participant has any sessions at all
    const hasAnySessions = participant.sessions.morning.length > 0 || participant.sessions.afternoon.length > 0;
    if (!hasAnySessions) {
      // If no sessions, mark all lesson hours as absent
      lessonHours.forEach(hour => {
        const hourBlock = hourBlocks.find(h => h.hour === hour);
        if (hourBlock) {
          hourBlock.isPresent = false;
        }
      });
      return hourBlocks;
    }

    // Check morning presence (9-12)
    if (participant.sessions.morning.length > 0) {
      for (let hour = 9; hour <= 12; hour++) {
        const hourBlock = hourBlocks.find(h => h.hour === hour);
        if (hourBlock) {
          hourBlock.isPresent = wasPresent(hour, participant.sessions.morning.map(s => ({
            joinTime: s.joinTime,
            leaveTime: s.leaveTime
          })));
        }
      }
    }

    // Check afternoon presence (14-17)
    if (participant.sessions.afternoon.length > 0) {
      for (let hour = 14; hour <= 17; hour++) {
        const hourBlock = hourBlocks.find(h => h.hour === hour);
        if (hourBlock) {
          hourBlock.isPresent = wasPresent(hour, participant.sessions.afternoon.map(s => ({
            joinTime: s.joinTime,
            leaveTime: s.leaveTime
          })));
        }
      }
    }

    return hourBlocks;
  };

  const calculateTotalHours = (participant: ProcessedParticipant): { present: number; absent: number; total: number } => {
    const hourBlocks = calculateHourlyAttendance(participant);
    const lessonHourBlocks = hourBlocks.filter(h => h.isLessonHour);
    
    const present = lessonHourBlocks.filter(h => h.isPresent).length;
    const total = lessonHourBlocks.length;
    const absent = total - present;

    return { present, absent, total };
  };

  const getActualStartTime = (participant: ProcessedParticipant): string => {
    const morningStart = participant.morningFirstJoin;
    const afternoonStart = participant.afternoonFirstJoin;
    
    if (lessonType === 'morning' && morningStart) {
      return morningStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (lessonType === 'afternoon' && afternoonStart) {
      return afternoonStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (lessonType === 'both') {
      if (morningStart && afternoonStart) {
        return morningStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else if (morningStart) {
        return morningStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else if (afternoonStart) {
        return afternoonStart.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      }
    }
    return '--:--';
  };

  const getLessonStartTime = (): string => {
    switch (lessonType) {
      case 'morning':
        return '09:00';
      case 'afternoon':
        return '14:00';
      case 'both':
        return '09:00';
      default:
        return '--:--';
    }
  };

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="attendance-dashboard">
      <div className="dashboard-header">
        <h3>
          <FiClock size={24} />
          Dashboard Presenze
        </h3>
        <div className="lesson-info">
          <span>Inizio Lezione Previsto: <strong>{getLessonStartTime()}</strong></span>
          <span>Tipo: <strong>{lessonType === 'morning' ? 'Mattina' : lessonType === 'afternoon' ? 'Pomeriggio' : 'Completa'}</strong></span>
        </div>
      </div>

      <div className="participants-dashboard">
        {participants.slice(0, 5).map((participant, index) => {
          const hourBlocks = calculateHourlyAttendance(participant);
          const totals = calculateTotalHours(participant);
          const actualStart = getActualStartTime(participant);
          const lessonStart = getLessonStartTime();

          return (
            <div key={participant.name} className="participant-dashboard">
              <div className="participant-header">
                <div className="participant-info">
                  <FiUser size={16} />
                  <span className="participant-name">{participant.name}</span>
                  <span className={`participant-status ${participant.isPresent ? 'present' : 'absent'}`}>
                    {participant.isPresent ? (
                      <>
                        <FiCheckCircle size={14} />
                        Presente
                      </>
                    ) : (
                      <>
                        <FiXCircle size={14} />
                        Assente
                      </>
                    )}
                  </span>
                </div>
                <div className="time-info">
                  <span>Inizio Previsto: <strong>{lessonStart}</strong></span>
                  <span>Inizio Effettivo: <strong className={actualStart === '--:--' ? 'absent' : 'present'}>{actualStart}</strong></span>
                </div>
              </div>

              <div className="hours-visualization">
                <div className="hours-grid">
                  {hourBlocks.filter(h => h.isLessonHour).map((hourBlock) => (
                    <div
                      key={hourBlock.hour}
                      className={`hour-block ${hourBlock.isPresent ? 'present' : 'absent'}`}
                      title={`${formatHour(hourBlock.hour)} - ${hourBlock.isPresent ? 'Presente' : 'Assente'}`}
                    >
                      <span className="hour-label">{formatHour(hourBlock.hour)}</span>
                      <div className="hour-status">
                        {hourBlock.isPresent ? '✅' : '❌'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="totals-summary">
                <div className="total-item present">
                  <span className="total-label">Ore Presenti:</span>
                  <span className="total-value">{totals.present}h</span>
                </div>
                <div className="total-item absent">
                  <span className="total-label">Ore Assenti:</span>
                  <span className="total-value">{totals.absent}h</span>
                </div>
                <div className="total-item total">
                  <span className="total-label">Totale Ore:</span>
                  <span className="total-value">{totals.total}h</span>
                </div>
                <div className="percentage">
                  <span>{totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0}% presenza</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard-legend">
        <h4>Legenda:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="hour-block present small"></div>
            <span>Ora presente (≥30 min)</span>
          </div>
          <div className="legend-item">
            <div className="hour-block absent small"></div>
            <span>Ora assente (&lt;30 min)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
