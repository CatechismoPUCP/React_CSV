import { ProcessedParticipant, LessonType } from '../types';
import { LESSON_HOURS } from '../constants';

export class LessonService {
  /**
   * Calculates dynamic lesson hours based on actual participant data
   */
  static calculateDynamicLessonHours(
    participants: ProcessedParticipant[], 
    organizer: ProcessedParticipant | null, 
    lessonType: LessonType
  ): number[] {
    const allParticipants = organizer ? [...participants, organizer] : participants;
    const hours = new Set<number>();
    
    allParticipants.forEach(participant => {
      // Add hours from morning sessions - include all hours with significant activity (excluding 13:00 lunch break)
      if (lessonType !== 'afternoon') {
        participant.allConnections.morning.forEach(connection => {
          const startHour = connection.joinTime.getHours();
          const endHour = connection.leaveTime.getHours();
          
          // Add all hours where there's significant presence (at least 15 minutes)
          for (let hour = Math.max(LESSON_HOURS.MORNING.START, startHour); hour <= Math.min(12, endHour); hour++) {
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
          for (let hour = Math.max(LESSON_HOURS.AFTERNOON.START, startHour); hour <= Math.min(LESSON_HOURS.AFTERNOON.END, endHour); hour++) {
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
      
      // For fast mode, add hours from both sessions based on significant activity (excluding 13:00)
      if (lessonType === 'fast') {
        // Morning connections - include all hours with significant activity
        participant.allConnections.morning.forEach(connection => {
          const startHour = connection.joinTime.getHours();
          const endHour = connection.leaveTime.getHours();
          
          for (let hour = Math.max(9, startHour); hour <= Math.min(12, endHour); hour++) {
            if (hour === 13) continue; // Skip lunch break
            
            // Calculate presence in this hour
            const hourStart = new Date(connection.joinTime);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(connection.joinTime);
            hourEnd.setHours(hour, 59, 59, 999);
            
            const sessionStart = new Date(Math.max(connection.joinTime.getTime(), hourStart.getTime()));
            const sessionEnd = new Date(Math.min(connection.leaveTime.getTime(), hourEnd.getTime()));
            
            if (sessionEnd > sessionStart) {
              const presenceMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
              if (presenceMinutes >= 15) {
                hours.add(hour);
              }
            }
          }
        });
        
        // Afternoon connections - include all hours with significant activity
        participant.allConnections.afternoon.forEach(connection => {
          const startHour = connection.joinTime.getHours();
          const endHour = connection.leaveTime.getHours();
          
          for (let hour = Math.max(14, startHour); hour <= Math.min(18, endHour); hour++) {
            if (hour === 13) continue; // Skip lunch break
            
            // Calculate presence in this hour
            const hourStart = new Date(connection.joinTime);
            hourStart.setHours(hour, 0, 0, 0);
            const hourEnd = new Date(connection.joinTime);
            hourEnd.setHours(hour, 59, 59, 999);
            
            const sessionStart = new Date(Math.max(connection.joinTime.getTime(), hourStart.getTime()));
            const sessionEnd = new Date(Math.min(connection.leaveTime.getTime(), hourEnd.getTime()));
            
            if (sessionEnd > sessionStart) {
              const presenceMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
              if (presenceMinutes >= 15) {
                hours.add(hour);
              }
            }
          }
        });
      }
    });
    
    // Filter out 13:00 as final safety check (lunch break)
    return Array.from(hours).filter(hour => hour !== 13).sort((a, b) => a - b);
  }

  /**
   * Validates lesson type requirements
   */
  static validateLessonRequirements(
    lessonType: LessonType,
    morningFile: File | null,
    afternoonFile: File | null,
    templateFile: File | null,
    subject: string
  ): string | null {
    if (!templateFile || !subject.trim()) {
      return 'MISSING_TEMPLATE_OR_SUBJECT';
    }

    // Fast mode validation: at least one file must be present
    if (lessonType === 'fast') {
      if (!morningFile && !afternoonFile) {
        return 'MISSING_FAST_FILES';
      }
      return null;
    }

    if (lessonType === 'both' && (!morningFile || !afternoonFile)) {
      return 'MISSING_BOTH_FILES';
    }

    if (lessonType === 'morning' && !morningFile) {
      return 'MISSING_MORNING_FILE';
    }

    if (lessonType === 'afternoon' && !afternoonFile) {
      return 'MISSING_AFTERNOON_FILE';
    }

    return null;
  }
}
