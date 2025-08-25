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
    // Helper to format connection times
    const formatConnections = (conns: Array<{ joinTime: Date; leaveTime: Date; }>): string => {
      if (!conns || conns.length === 0) return 'Nessuna connessione';
      return conns
        .map(conn => {
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
        })
        .join('; ');
    };

    // Normalize and merge overlapping/adjacent intervals
    const normalize = (conns: Array<{ joinTime: Date; leaveTime: Date; }>) => {
      if (!conns || conns.length === 0) return [] as Array<{ joinTime: Date; leaveTime: Date; }>;
      const sorted = [...conns].sort((a, b) => a.joinTime.getTime() - b.joinTime.getTime());
      const merged: Array<{ joinTime: Date; leaveTime: Date; }> = [];
      for (const c of sorted) {
        if (merged.length === 0) {
          merged.push({ joinTime: c.joinTime, leaveTime: c.leaveTime });
          continue;
        }
        const last = merged[merged.length - 1];
        // If overlapping or touching, merge ranges
        if (c.joinTime.getTime() <= last.leaveTime.getTime()) {
          if (c.leaveTime.getTime() > last.leaveTime.getTime()) {
            last.leaveTime = c.leaveTime;
          }
        } else {
          merged.push({ joinTime: c.joinTime, leaveTime: c.leaveTime });
        }
      }
      return merged;
    };

    // Merge connections and sessions with normalization
    const mergedMorning = normalize([
      ...target.allConnections.morning,
      ...source.allConnections.morning,
    ]);
    const mergedAfternoon = normalize([
      ...target.allConnections.afternoon,
      ...source.allConnections.afternoon,
    ]);

    // Recompute first/last join/leave per period
    const morningFirstJoin = mergedMorning[0]?.joinTime;
    const morningLastLeave = mergedMorning[mergedMorning.length - 1]?.leaveTime;
    const afternoonFirstJoin = mergedAfternoon[0]?.joinTime;
    const afternoonLastLeave = mergedAfternoon[mergedAfternoon.length - 1]?.leaveTime;

    // Deduplicate sessions by join/leave/name/email signature
    const sessionKey = (s: any) => `${s.name}|${s.email}|${s.joinTime?.getTime?.() ?? ''}|${s.leaveTime?.getTime?.() ?? ''}`;
    const dedupeSessions = (arr: any[]) => {
      const map = new Map<string, any>();
      for (const s of arr) {
        map.set(sessionKey(s), s);
      }
      return Array.from(map.values());
    };

    const sessionsMorning = dedupeSessions([
      ...target.sessions.morning,
      ...source.sessions.morning,
    ]);
    const sessionsAfternoon = dedupeSessions([
      ...target.sessions.afternoon,
      ...source.sessions.afternoon,
    ]);

    // Build aliases; include both names and existing aliases, deduping by name+connectionsList
    const sourceAlias = {
      name: source.name,
      connectionsList: formatConnections([...source.allConnections.morning, ...source.allConnections.afternoon]),
    };
    const targetAliasSelf = {
      name: target.name,
      connectionsList: formatConnections([...target.allConnections.morning, ...target.allConnections.afternoon]),
    };

    const rawAliases = [
      ...(target.aliases || []),
      ...(source.aliases || []),
      sourceAlias,
      // If names differ, keep target as alias too so no hierarchy in data
      ...(target.name !== source.name ? [targetAliasSelf] : []),
    ];
    const aliasKey = (a: { name: string; connectionsList: string }) => `${a.name}|${a.connectionsList}`;
    const aliases = Array.from(new Map(rawAliases.map(a => [aliasKey(a), a])).values());

    // Presence/absence rules: commutative combination
    const isPresent = Boolean(target.isPresent || source.isPresent);
    const totalAbsenceMinutes = Math.min(target.totalAbsenceMinutes ?? 0, source.totalAbsenceMinutes ?? 0);
    const isAbsent = !isPresent;

    // Deterministic canonical name and email to avoid hierarchy/order effects
    const canonicalName = [target.name?.trim() || '', source.name?.trim() || '']
      .sort((a, b) => a.localeCompare(b, 'it-IT', { sensitivity: 'base' }))[0] || target.name;
    const canonicalEmail = [target.email?.trim() || '', source.email?.trim() || '']
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'it-IT', { sensitivity: 'base' }))[0] || '';

    return {
      // Order-independent visible fields
      ...target,
      name: canonicalName,
      email: canonicalEmail,
      isPresent,
      isAbsent,
      totalAbsenceMinutes,
      aliases,
      allConnections: {
        morning: mergedMorning,
        afternoon: mergedAfternoon,
      },
      sessions: {
        morning: sessionsMorning,
        afternoon: sessionsAfternoon,
      },
      morningFirstJoin,
      morningLastLeave,
      afternoonFirstJoin,
      afternoonLastLeave,
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
