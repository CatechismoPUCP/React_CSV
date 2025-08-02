import React from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { FiClock, FiUser, FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface AttendanceDashboardProps {
  participants: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  lessonType: LessonType;
  lessonDate: Date;
  lessonHours: number[];
}

interface HourBlock {
  hour: number;
  isPresent: boolean;
  isLessonHour: boolean;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  participants,
  organizer,
  lessonType,
  lessonDate,
  lessonHours
}) => {
  const getLessonHours = (): number[] => {
    // Use dynamic lesson hours if available, otherwise fall back to calculated hours
    if (lessonHours && lessonHours.length > 0) {
      // Filter out 13:00 as it's always lunch break
      return lessonHours.filter(hour => hour !== 13);
    }
    
    // Calculate dynamic hours based on actual participant data
    const calculateDynamicHours = (): number[] => {
      const allParticipants = organizer ? [...participants, organizer] : participants;
      const hours = new Set<number>();
      
      allParticipants.forEach(participant => {
        // Add hours from morning sessions - include all hours with significant activity
        if (lessonType !== 'afternoon') {
          participant.allConnections.morning.forEach(connection => {
            const startHour = connection.joinTime.getHours();
            const endHour = connection.leaveTime.getHours();
            
            // Add all hours where there's significant presence (at least 15 minutes)
            for (let hour = Math.max(9, startHour); hour <= Math.min(12, endHour); hour++) {
              // Skip 13:00 as it's lunch break
              if (hour === 13) continue;
              
              // Calculate presence in this hour
              const hourStart = new Date(connection.joinTime);
              hourStart.setHours(hour, 0, 0, 0);
              const hourEnd = new Date(connection.joinTime);
              hourEnd.setHours(hour, 59, 59, 999);
              
              const sessionStart = new Date(Math.max(connection.joinTime.getTime(), hourStart.getTime()));
              const sessionEnd = new Date(Math.min(connection.leaveTime.getTime(), hourEnd.getTime()));
              
              if (sessionEnd > sessionStart) {
                const presenceMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
                // Include hour if there's at least 15 minutes of presence
                if (presenceMinutes >= 15) {
                  hours.add(hour);
                }
              }
            }
          });
        }
        
        // Add hours from afternoon sessions - include all hours with significant activity
        if (lessonType !== 'morning') {
          participant.allConnections.afternoon.forEach(connection => {
            const startHour = connection.joinTime.getHours();
            const endHour = connection.leaveTime.getHours();
            
            // Add all hours where there's significant presence (at least 15 minutes)
            for (let hour = Math.max(14, startHour); hour <= Math.min(18, endHour); hour++) {
              // Calculate presence in this hour
              const hourStart = new Date(connection.joinTime);
              hourStart.setHours(hour, 0, 0, 0);
              const hourEnd = new Date(connection.joinTime);
              hourEnd.setHours(hour, 59, 59, 999);
              
              const sessionStart = new Date(Math.max(connection.joinTime.getTime(), hourStart.getTime()));
              const sessionEnd = new Date(Math.min(connection.leaveTime.getTime(), hourEnd.getTime()));
              
              if (sessionEnd > sessionStart) {
                const presenceMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
                // Include hour if there's at least 15 minutes of presence
                if (presenceMinutes >= 15) {
                  hours.add(hour);
                }
              }
            }
          });
        }
      });
      
      return Array.from(hours).sort((a, b) => a - b);
    };
    
    const dynamicHours = calculateDynamicHours();
    if (dynamicHours.length > 0) {
      return dynamicHours;
    }
    
    // Final fallback to default hours (excluding 13:00)
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

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
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
      
      let totalPresenceMinutes = 0;
      
      sessions.forEach(session => {
        // Use the actual session date instead of lessonDate
        const sessionDate = session.joinTime;
        const hourStart = new Date(sessionDate);
        hourStart.setHours(targetHour, 0, 0, 0);
        const hourEnd = new Date(sessionDate);
        hourEnd.setHours(targetHour, 59, 59, 999);
        
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

    // Check morning presence for all lesson hours
    if (participant.sessions.morning.length > 0) {
      const morningConnections = participant.sessions.morning.map(s => ({
        joinTime: s.joinTime,
        leaveTime: s.leaveTime
      }));
      
      // Check all morning lesson hours (not just a range)
      lessonHours.forEach(hour => {
        if (hour >= 9 && hour <= 12) { // Morning hours only
          const hourBlock = hourBlocks.find(h => h.hour === hour);
          if (hourBlock) {
            hourBlock.isPresent = wasPresent(hour, morningConnections);
          }
        }
      });
    }

    // Check afternoon presence for all lesson hours
    if (participant.sessions.afternoon.length > 0) {
      const afternoonConnections = participant.sessions.afternoon.map(s => ({
        joinTime: s.joinTime,
        leaveTime: s.leaveTime
      }));
      
      // Check all afternoon lesson hours (not just a range)
      lessonHours.forEach(hour => {
        if (hour >= 14 && hour <= 18) { // Afternoon hours only
          const hourBlock = hourBlocks.find(h => h.hour === hour);
          if (hourBlock) {
            hourBlock.isPresent = wasPresent(hour, afternoonConnections);
          }
        }
      });
    }

    return hourBlocks;
  };

  const calculateTotalHours = (participant: ProcessedParticipant): { present: number; absent: number; total: number } => {
    const hourBlocks = calculateHourlyAttendance(participant);
    const lessonHourBlocks = hourBlocks.filter((h: HourBlock) => h.isLessonHour);
    
    const present = lessonHourBlocks.filter((h: HourBlock) => h.isPresent).length;
    const total = lessonHourBlocks.length;
    const absent = total - present;

    return { present, absent, total };
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
