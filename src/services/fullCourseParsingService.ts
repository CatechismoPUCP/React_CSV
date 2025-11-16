import Papa from 'papaparse';
import {
  FullCourseCSVRow,
  FullCourseDayData,
  FullCourseSessionData,
  FullCourseParticipantInfo,
  ParsedFullCourseData,
} from '../types/course';

/**
 * Service for parsing full course CSV exports from Zoom
 * Handles multi-day courses with all lessons in a single CSV file
 */
export class FullCourseParsingService {
  /**
   * Parse full course CSV content
   */
  parseFullCourseCSV(csvContent: string): ParsedFullCourseData {
    // Parse CSV using PapaParse
    const result = Papa.parse<FullCourseCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    if (result.data.length === 0) {
      throw new Error('Nessun dato trovato nel file CSV');
    }

    // Extract course metadata from first row
    const firstRow = result.data[0];
    const courseName = firstRow['Argomento'] || 'Corso senza nome';
    const zoomMeetingId = firstRow['ID'] || '';
    const organizerName = this.cleanParticipantName(firstRow['Nome organizzatore'] || '');
    const organizerEmail = firstRow['E-mail organizzatore'] || '';

    // Group rows by date
    const dayDataMap = this.groupRowsByDate(result.data);

    // Convert to day data structures
    const days = this.createDayDataStructures(dayDataMap, courseName, zoomMeetingId);

    // Extract all unique participants
    const allParticipants = this.extractAllParticipants(days, organizerName, organizerEmail);

    // Calculate statistics
    const totalSessions = days.reduce((sum, day) => sum + day.sessions.length, 0);
    const dateRange = this.calculateDateRange(days);

    return {
      courseName,
      zoomMeetingId,
      organizer: {
        name: organizerName,
        email: organizerEmail,
      },
      days,
      allParticipants,
      aliasSuggestions: [], // Will be filled by alias service
      dateRange,
      statistics: {
        totalDays: days.length,
        totalParticipants: allParticipants.length,
        totalSessions,
      },
    };
  }

  /**
   * Group CSV rows by date
   */
  private groupRowsByDate(rows: FullCourseCSVRow[]): Map<string, FullCourseCSVRow[]> {
    const dateMap = new Map<string, FullCourseCSVRow[]>();

    for (const row of rows) {
      const dateStr = row['Ora di inizio'];
      if (!dateStr) continue;

      const date = this.parseZoomDateTime(dateStr);
      const dateKey = this.formatDate(date); // YYYY-MM-DD

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(row);
    }

    return dateMap;
  }

  /**
   * Create day data structures from grouped rows
   */
  private createDayDataStructures(
    dayDataMap: Map<string, FullCourseCSVRow[]>,
    courseName: string,
    zoomMeetingId: string
  ): FullCourseDayData[] {
    const days: FullCourseDayData[] = [];

    // Sort dates
    const sortedDates = Array.from(dayDataMap.keys()).sort();

    for (const dateKey of sortedDates) {
      const rows = dayDataMap.get(dateKey)!;
      const sessions: FullCourseSessionData[] = [];
      const participantNames = new Set<string>();

      let earliestStart: Date | null = null;
      let latestEnd: Date | null = null;

      for (const row of rows) {
        const participantName = this.cleanParticipantName(row['Nome (nome originale)'] || '');
        if (!participantName) continue;

        const joinTime = this.parseZoomDateTime(row['Ora di ingresso']);
        const leaveTime = this.parseZoomDateTime(row['Ora di uscita']);
        const duration = parseInt(row['Durata (minuti)']) || 0;

        // Track earliest/latest times
        if (!earliestStart || joinTime < earliestStart) {
          earliestStart = joinTime;
        }
        if (!latestEnd || leaveTime > latestEnd) {
          latestEnd = leaveTime;
        }

        sessions.push({
          participantName,
          email: row['E-mail'] || '',
          joinTime,
          leaveTime,
          duration,
          isGuest: row['Guest'] === 'Sì',
          inWaitingRoom: row['In sala d\'attesa'] === 'Sì',
          disclaimerResponse: row['Risposta di esclusione di responsabilità per la registrazione'] || '',
        });

        participantNames.add(participantName);
      }

      days.push({
        date: dateKey,
        zoomMeetingId,
        courseName,
        startTime: earliestStart || new Date(),
        endTime: latestEnd || new Date(),
        sessions,
        participantNames,
      });
    }

    return days;
  }

  /**
   * Extract all unique participants from days
   */
  private extractAllParticipants(
    days: FullCourseDayData[],
    organizerName: string,
    organizerEmail: string
  ): FullCourseParticipantInfo[] {
    const participantMap = new Map<string, FullCourseParticipantInfo>();
    let order = 1;

    // First, add organizer
    const cleanOrganizerName = this.cleanParticipantName(organizerName);
    participantMap.set(cleanOrganizerName.toLowerCase(), {
      id: this.generateParticipantId(cleanOrganizerName),
      primaryName: cleanOrganizerName,
      aliases: [cleanOrganizerName],
      email: organizerEmail,
      isOrganizer: true,
      masterOrder: 0, // Organizer always first
      daysPresent: [],
    });

    // Collect all unique participant names
    const allNames = new Set<string>();
    for (const day of days) {
      for (const session of day.sessions) {
        const cleanName = this.cleanParticipantName(session.participantName);
        if (cleanName) {
          allNames.add(cleanName);
        }
      }
    }

    // Create participant entries (excluding organizer)
    for (const name of Array.from(allNames).sort()) {
      const nameKey = name.toLowerCase();

      // Skip if already added (organizer)
      if (participantMap.has(nameKey)) continue;

      // Find email (if any) from sessions
      let email = '';
      for (const day of days) {
        const sessionWithEmail = day.sessions.find(
          s => this.cleanParticipantName(s.participantName).toLowerCase() === nameKey && s.email
        );
        if (sessionWithEmail?.email) {
          email = sessionWithEmail.email;
          break;
        }
      }

      // Find days present
      const daysPresent: string[] = [];
      for (const day of days) {
        if (day.participantNames.has(name)) {
          daysPresent.push(day.date);
        }
      }

      participantMap.set(nameKey, {
        id: this.generateParticipantId(name),
        primaryName: name,
        aliases: [name],
        email,
        isOrganizer: false,
        masterOrder: order++,
        daysPresent,
      });
    }

    return Array.from(participantMap.values()).sort((a, b) => a.masterOrder - b.masterOrder);
  }

  /**
   * Calculate date range
   */
  private calculateDateRange(days: FullCourseDayData[]): { start: string; end: string } {
    if (days.length === 0) {
      const today = this.formatDate(new Date());
      return { start: today, end: today };
    }

    const sortedDates = days.map(d => d.date).sort();
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    };
  }

  /**
   * Parse Zoom date/time string
   * Format: "19/09/2025 01:58:39 PM"
   */
  private parseZoomDateTime(dateTimeStr: string): Date {
    if (!dateTimeStr) return new Date();

    try {
      const cleaned = dateTimeStr.replace(/"/g, '').trim();
      const parts = cleaned.split(/\s+/);
      const datePart = parts[0];
      const timePart = parts[1] || '00:00:00';
      const ampm = (parts[2] || '').toUpperCase();

      const [p1, p2, p3] = datePart.split('/').map(v => parseInt(v, 10));
      let day = p1;
      let month = p2;
      const year = p3;

      // Auto-detect DD/MM/YYYY vs MM/DD/YYYY
      if (day > 12 && month <= 12) {
        // Already DD/MM
      } else if (month > 12 && day <= 12) {
        // Was MM/DD -> swap
        const tmp = day;
        day = month;
        month = tmp;
      }
      // If both <= 12, assume DD/MM (Italian format)

      const [hhStr = '0', mmStr = '0', ssStr = '0'] = timePart.split(':');
      let hour24 = parseInt(hhStr, 10);
      const minute = parseInt(mmStr, 10) || 0;
      const second = parseInt(ssStr, 10) || 0;

      if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
      else if (ampm === 'AM' && hour24 === 12) hour24 = 0;

      return new Date(year, (month || 1) - 1, day || 1, hour24 || 0, minute, second);
    } catch (error) {
      console.error('Error parsing date:', dateTimeStr, error);
      return new Date();
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Clean participant name (remove parentheses, trim)
   */
  private cleanParticipantName(name: string): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)$/, '').trim();
  }

  /**
   * Generate unique participant ID
   */
  private generateParticipantId(name: string): string {
    return `participant_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }
}

// Singleton instance
export const fullCourseParsingService = new FullCourseParsingService();
