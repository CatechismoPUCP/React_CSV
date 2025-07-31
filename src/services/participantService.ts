import { ProcessedParticipant } from '../types';

export class ParticipantService {
  /**
   * Formats connection times for display
   */
  static formatConnectionTimes(connections: Array<{ joinTime: Date; leaveTime: Date; }>): string {
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
  }

  /**
   * Calculates total absence minutes for a participant
   */
  static calculateAbsenceMinutes(participant: ProcessedParticipant): number {
    // This is a simplified calculation - in reality you'd need more complex logic
    // based on the actual lesson times and connection gaps
    return participant.totalAbsenceMinutes || 0;
  }

  /**
   * Determines if a participant should be marked as present
   */
  static shouldBePresent(participant: ProcessedParticipant, maxAbsenceMinutes: number = 15): boolean {
    return this.calculateAbsenceMinutes(participant) <= maxAbsenceMinutes;
  }

  /**
   * Creates a new manual participant
   */
  static createManualParticipant(name: string): ProcessedParticipant {
    return {
      name: name.trim(),
      email: '',
      totalAbsenceMinutes: 999, // Mark as absent by default
      isPresent: false,
      isAbsent: true,
      allConnections: {
        morning: [],
        afternoon: []
      },
      sessions: {
        morning: [],
        afternoon: []
      }
    };
  }

  /**
   * Merges two participants, combining their connections
   */
  static mergeParticipants(target: ProcessedParticipant, source: ProcessedParticipant): ProcessedParticipant {
    const connectionsList = this.formatConnectionTimes([
      ...source.allConnections.morning,
      ...source.allConnections.afternoon
    ]);

    return {
      ...target,
      aliases: [
        ...(target.aliases || []),
        {
          name: source.name,
          connectionsList
        },
        ...(source.aliases || [])
      ],
      allConnections: {
        morning: [...target.allConnections.morning, ...source.allConnections.morning]
          .sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime()),
        afternoon: [...target.allConnections.afternoon, ...source.allConnections.afternoon]
          .sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime())
      },
      sessions: {
        morning: [...target.sessions.morning, ...source.sessions.morning],
        afternoon: [...target.sessions.afternoon, ...source.sessions.afternoon]
      }
    };
  }

  /**
   * Updates participant presence status
   */
  static togglePresence(participant: ProcessedParticipant): ProcessedParticipant {
    return {
      ...participant,
      isPresent: !participant.isPresent,
      totalAbsenceMinutes: participant.isPresent ? 999 : 0
    };
  }

  /**
   * Gets participant statistics
   */
  static getParticipantStats(participants: ProcessedParticipant[], organizer?: ProcessedParticipant) {
    const presentCount = participants.filter(p => p.isPresent).length;
    const absentCount = participants.length - presentCount;
    const totalParticipants = participants.length + (organizer ? 1 : 0);

    return {
      total: totalParticipants,
      present: presentCount + (organizer ? 1 : 0),
      absent: absentCount,
      hasAbsences: absentCount > 0
    };
  }
}
