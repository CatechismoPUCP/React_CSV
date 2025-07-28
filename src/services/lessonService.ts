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
      // Add hours from morning sessions
      if (lessonType !== 'afternoon') {
        participant.allConnections.morning.forEach(connection => {
          const startHour = connection.joinTime.getHours();
          const endHour = connection.leaveTime.getHours();
          for (let h = Math.max(LESSON_HOURS.MORNING.START, startHour); h <= Math.min(LESSON_HOURS.MORNING.END, endHour); h++) {
            hours.add(h);
          }
        });
      }
      
      // Add hours from afternoon sessions
      if (lessonType !== 'morning') {
        participant.allConnections.afternoon.forEach(connection => {
          const startHour = connection.joinTime.getHours();
          const endHour = connection.leaveTime.getHours();
          for (let h = Math.max(LESSON_HOURS.AFTERNOON.START, startHour); h <= Math.min(LESSON_HOURS.AFTERNOON.END, endHour); h++) {
            hours.add(h);
          }
        });
      }
    });
    
    return Array.from(hours).sort((a, b) => a - b);
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
