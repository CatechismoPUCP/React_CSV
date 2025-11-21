import Papa from 'papaparse';
import {
  FullCourseCSVRow,
  FullCourseDayData,
  FullCourseSessionData,
  FullCourseParticipantInfo,
  ParsedFullCourseData,
} from '../types/course';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Date format for day keys and file naming (ISO format) */
const DATE_FORMAT_ISO = 'YYYY-MM-DD';

/** Default course name when not specified in CSV */
const DEFAULT_COURSE_NAME = 'Corso senza nome';

/** Hour threshold for morning/afternoon split (24-hour format) */
const AFTERNOON_START_HOUR = 13;

/** Master order value for organizer (always first) */
const ORGANIZER_ORDER = 0;

// ============================================================================
// FULL COURSE PARSING SERVICE
// ============================================================================

/**
 * Service for parsing full course CSV exports from Zoom.
 *
 * This service handles:
 * - Parsing CSV files exported from Zoom with all course lessons
 * - Grouping sessions by date
 * - Extracting participant information across all days
 * - Calculating course statistics and date ranges
 * - Handling Italian date formats (DD/MM/YYYY) and US formats (MM/DD/YYYY)
 *
 * @remarks
 * The CSV format is expected to be Zoom's native export format with headers in Italian.
 * Empty lines between days are automatically handled by PapaParse's skipEmptyLines option.
 */
export class FullCourseParsingService {
  // ============================================================================
  // MAIN PARSING
  // ============================================================================

  /**
   * Parses a full course CSV file and extracts all course data.
   *
   * @param csvContent - Raw CSV content as string
   * @returns Parsed course data with days, participants, and statistics
   * @throws Error if CSV contains no data
   *
   * @example
   * ```ts
   * const csvContent = await file.text();
   * const courseData = parsingService.parseFullCourseCSV(csvContent);
   * console.log(`Found ${courseData.days.length} days`);
   * ```
   */
  parseFullCourseCSV(csvContent: string): ParsedFullCourseData {
    // Parse CSV using PapaParse
    const parsedCSV = this.parseCSVWithPapaParse(csvContent);

    // Validate we have data
    if (parsedCSV.data.length === 0) {
      throw new Error('Nessun dato trovato nel file CSV');
    }

    // Extract course metadata
    const courseMetadata = this.extractCourseMetadata(parsedCSV.data);

    // Group and structure data by day
    const dayDataMap = this.groupRowsByDate(parsedCSV.data);
    const days = this.createDayDataStructures(
      dayDataMap,
      courseMetadata.courseName,
      courseMetadata.zoomMeetingId
    );

    // Extract all unique participants
    const allParticipants = this.extractAllParticipants(
      days,
      courseMetadata.organizerName,
      courseMetadata.organizerEmail
    );

    // Calculate course statistics
    const statistics = this.calculateStatistics(days, allParticipants);
    const dateRange = this.calculateDateRange(days);

    return {
      courseName: courseMetadata.courseName,
      zoomMeetingId: courseMetadata.zoomMeetingId,
      organizer: {
        name: courseMetadata.organizerName,
        email: courseMetadata.organizerEmail,
      },
      days,
      allParticipants,
      aliasSuggestions: [], // Will be filled by alias service
      dateRange,
      statistics,
    };
  }

  // ============================================================================
  // CSV PARSING
  // ============================================================================

  /**
   * Parses CSV content using PapaParse library.
   *
   * @private
   * @param csvContent - Raw CSV string
   * @returns Parsed CSV result with data and any errors
   */
  private parseCSVWithPapaParse(csvContent: string): Papa.ParseResult<FullCourseCSVRow> {
    const result = Papa.parse<FullCourseCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0) {
      console.warn('CSV parsing warnings:', result.errors);
    }

    return result;
  }

  /**
   * Extracts course metadata from the first CSV row.
   *
   * @private
   * @param rows - Parsed CSV rows
   * @returns Course metadata object
   */
  private extractCourseMetadata(rows: FullCourseCSVRow[]): {
    courseName: string;
    zoomMeetingId: string;
    organizerName: string;
    organizerEmail: string;
  } {
    const firstRow = rows[0];

    return {
      courseName: firstRow['Argomento'] || DEFAULT_COURSE_NAME,
      zoomMeetingId: firstRow['ID'] || '',
      organizerName: this.cleanParticipantName(firstRow['Nome organizzatore'] || ''),
      organizerEmail: firstRow['E-mail organizzatore'] || '',
    };
  }

  // ============================================================================
  // DATA GROUPING AND STRUCTURING
  // ============================================================================

  /**
   * Groups CSV rows by date, creating a map of date to sessions.
   *
   * @private
   * @param rows - Array of CSV rows to group
   * @returns Map with date keys (YYYY-MM-DD) and corresponding session rows
   *
   * @example
   * ```ts
   * const dateMap = this.groupRowsByDate(csvRows);
   * // Returns: Map { '2025-09-19' => [...rows], '2025-09-20' => [...rows] }
   * ```
   */
  private groupRowsByDate(rows: FullCourseCSVRow[]): Map<string, FullCourseCSVRow[]> {
    const dateMap = new Map<string, FullCourseCSVRow[]>();

    for (const row of rows) {
      const dateStr = row['Ora di inizio'];
      if (!dateStr) continue;

      const date = this.parseZoomDateTime(dateStr);
      const dateKey = this.formatDate(date);

      this.addRowToDateGroup(dateMap, dateKey, row);
    }

    return dateMap;
  }

  /**
   * Adds a CSV row to the appropriate date group in the map.
   *
   * @private
   * @param dateMap - Map to add the row to
   * @param dateKey - Date key (YYYY-MM-DD)
   * @param row - CSV row to add
   */
  private addRowToDateGroup(
    dateMap: Map<string, FullCourseCSVRow[]>,
    dateKey: string,
    row: FullCourseCSVRow
  ): void {
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }
    dateMap.get(dateKey)!.push(row);
  }

  /**
   * Creates structured day data objects from grouped CSV rows.
   *
   * @private
   * @param dayDataMap - Map of date to CSV rows
   * @param courseName - Name of the course
   * @param zoomMeetingId - Zoom meeting ID
   * @returns Array of structured day data, sorted by date
   */
  private createDayDataStructures(
    dayDataMap: Map<string, FullCourseCSVRow[]>,
    courseName: string,
    zoomMeetingId: string
  ): FullCourseDayData[] {
    const days: FullCourseDayData[] = [];

    // Sort dates chronologically
    const sortedDates = Array.from(dayDataMap.keys()).sort();

    for (const dateKey of sortedDates) {
      const rows = dayDataMap.get(dateKey)!;
      const dayData = this.createSingleDayData(rows, dateKey, courseName, zoomMeetingId);
      days.push(dayData);
    }

    return days;
  }

  /**
   * Creates a single day data structure from CSV rows.
   *
   * @private
   * @param rows - CSV rows for this day
   * @param dateKey - Date in YYYY-MM-DD format
   * @param courseName - Course name
   * @param zoomMeetingId - Zoom meeting ID
   * @returns Structured day data object
   */
  private createSingleDayData(
    rows: FullCourseCSVRow[],
    dateKey: string,
    courseName: string,
    zoomMeetingId: string
  ): FullCourseDayData {
    const sessions: FullCourseSessionData[] = [];
    const participantNames = new Set<string>();
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;

    for (const row of rows) {
      const session = this.createSessionFromRow(row);
      if (!session) continue;

      sessions.push(session);
      participantNames.add(session.participantName);

      // Track earliest/latest times
      earliestStart = this.updateEarliestTime(earliestStart, session.joinTime);
      latestEnd = this.updateLatestTime(latestEnd, session.leaveTime);
    }

    return {
      date: dateKey,
      zoomMeetingId,
      courseName,
      startTime: earliestStart || new Date(),
      endTime: latestEnd || new Date(),
      sessions,
      participantNames,
    };
  }

  /**
   * Creates a session data object from a CSV row.
   *
   * @private
   * @param row - CSV row data
   * @returns Session data object, or null if participant name is invalid
   */
  private createSessionFromRow(row: FullCourseCSVRow): FullCourseSessionData | null {
    const participantName = this.cleanParticipantName(row['Nome (nome originale)'] || '');
    if (!participantName) return null;

    const joinTime = this.parseZoomDateTime(row['Ora di ingresso']);
    const leaveTime = this.parseZoomDateTime(row['Ora di uscita']);
    const duration = parseInt(row['Durata (minuti)']) || 0;

    return {
      participantName,
      email: row['E-mail'] || '',
      joinTime,
      leaveTime,
      duration,
      isGuest: row['Guest'] === 'Sì',
      inWaitingRoom: row['In sala d\'attesa'] === 'Sì',
      disclaimerResponse: row['Risposta di esclusione di responsabilità per la registrazione'] || '',
    };
  }

  // ============================================================================
  // PARTICIPANT EXTRACTION
  // ============================================================================

  /**
   * Extracts all unique participants from course days.
   *
   * Creates a master list of participants with their metadata, including:
   * - Primary name and aliases
   * - Email addresses
   * - Organizer status
   * - Master ordering for template placeholders
   * - Days present in course
   *
   * @private
   * @param days - Array of day data
   * @param organizerName - Name of course organizer
   * @param organizerEmail - Email of course organizer
   * @returns Array of participant info objects, sorted by master order
   */
  private extractAllParticipants(
    days: FullCourseDayData[],
    organizerName: string,
    organizerEmail: string
  ): FullCourseParticipantInfo[] {
    const participantMap = new Map<string, FullCourseParticipantInfo>();

    // Add organizer first
    this.addOrganizerToParticipantMap(participantMap, organizerName, organizerEmail);

    // Collect all unique participant names
    const allNames = this.collectAllParticipantNames(days);

    // Create participant entries (excluding organizer)
    let order = 1;
    for (const name of Array.from(allNames).sort()) {
      if (this.isParticipantAlreadyAdded(participantMap, name)) continue;

      const email = this.findParticipantEmail(days, name);
      const daysPresent = this.findDaysPresent(days, name);

      this.addParticipantToMap(participantMap, name, email, daysPresent, order++);
    }

    return Array.from(participantMap.values()).sort((a, b) => a.masterOrder - b.masterOrder);
  }

  /**
   * Adds the course organizer to the participant map.
   *
   * @private
   * @param participantMap - Map to add organizer to
   * @param organizerName - Organizer's name
   * @param organizerEmail - Organizer's email
   */
  private addOrganizerToParticipantMap(
    participantMap: Map<string, FullCourseParticipantInfo>,
    organizerName: string,
    organizerEmail: string
  ): void {
    const cleanOrganizerName = this.cleanParticipantName(organizerName);
    participantMap.set(cleanOrganizerName.toLowerCase(), {
      id: this.generateParticipantId(cleanOrganizerName),
      primaryName: cleanOrganizerName,
      aliases: [cleanOrganizerName],
      email: organizerEmail,
      isOrganizer: true,
      masterOrder: ORGANIZER_ORDER,
      daysPresent: [],
    });
  }

  /**
   * Collects all unique participant names from all days.
   *
   * @private
   * @param days - Array of day data
   * @returns Set of unique participant names
   */
  private collectAllParticipantNames(days: FullCourseDayData[]): Set<string> {
    const allNames = new Set<string>();

    for (const day of days) {
      for (const session of day.sessions) {
        const cleanName = this.cleanParticipantName(session.participantName);
        if (cleanName) {
          allNames.add(cleanName);
        }
      }
    }

    return allNames;
  }

  /**
   * Checks if a participant is already in the map.
   *
   * @private
   * @param participantMap - Participant map to check
   * @param name - Participant name to check
   * @returns True if participant already exists
   */
  private isParticipantAlreadyAdded(
    participantMap: Map<string, FullCourseParticipantInfo>,
    name: string
  ): boolean {
    return participantMap.has(name.toLowerCase());
  }

  /**
   * Finds the email address for a participant.
   *
   * @private
   * @param days - Array of day data to search
   * @param name - Participant name
   * @returns Email address or empty string if not found
   */
  private findParticipantEmail(days: FullCourseDayData[], name: string): string {
    const nameKey = name.toLowerCase();

    for (const day of days) {
      const sessionWithEmail = day.sessions.find(
        s => this.cleanParticipantName(s.participantName).toLowerCase() === nameKey && s.email
      );
      if (sessionWithEmail?.email) {
        return sessionWithEmail.email;
      }
    }

    return '';
  }

  /**
   * Finds all days a participant was present.
   *
   * @private
   * @param days - Array of day data
   * @param name - Participant name
   * @returns Array of date strings (YYYY-MM-DD)
   */
  private findDaysPresent(days: FullCourseDayData[], name: string): string[] {
    const daysPresent: string[] = [];

    for (const day of days) {
      if (day.participantNames.has(name)) {
        daysPresent.push(day.date);
      }
    }

    return daysPresent;
  }

  /**
   * Adds a participant to the participant map.
   *
   * @private
   * @param participantMap - Map to add to
   * @param name - Participant name
   * @param email - Participant email
   * @param daysPresent - Array of dates present
   * @param order - Master order number
   */
  private addParticipantToMap(
    participantMap: Map<string, FullCourseParticipantInfo>,
    name: string,
    email: string,
    daysPresent: string[],
    order: number
  ): void {
    participantMap.set(name.toLowerCase(), {
      id: this.generateParticipantId(name),
      primaryName: name,
      aliases: [name],
      email,
      isOrganizer: false,
      masterOrder: order,
      daysPresent,
    });
  }

  // ============================================================================
  // STATISTICS AND CALCULATIONS
  // ============================================================================

  /**
   * Calculates course statistics.
   *
   * @private
   * @param days - Array of day data
   * @param participants - Array of participants
   * @returns Statistics object
   */
  private calculateStatistics(
    days: FullCourseDayData[],
    participants: FullCourseParticipantInfo[]
  ): {
    totalDays: number;
    totalParticipants: number;
    totalSessions: number;
  } {
    const totalSessions = days.reduce((sum, day) => sum + day.sessions.length, 0);

    return {
      totalDays: days.length,
      totalParticipants: participants.length,
      totalSessions,
    };
  }

  /**
   * Calculates the date range of the course.
   *
   * @private
   * @param days - Array of day data
   * @returns Object with start and end dates (YYYY-MM-DD format)
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

  // ============================================================================
  // DATE AND TIME PARSING
  // ============================================================================

  /**
   * Parses a Zoom date/time string into a Date object.
   *
   * Handles multiple formats:
   * - "DD/MM/YYYY HH:mm:ss AM/PM" (Italian format with 12-hour time)
   * - "MM/DD/YYYY HH:mm:ss AM/PM" (US format with 12-hour time)
   * - Auto-detects format by analyzing day/month values
   *
   * @private
   * @param dateTimeStr - Date/time string from Zoom CSV
   * @returns Parsed Date object, or current date if parsing fails
   *
   * @example
   * ```ts
   * const date = this.parseZoomDateTime('19/09/2025 01:58:39 PM');
   * // Returns: Date object for September 19, 2025 at 13:58:39
   * ```
   */
  private parseZoomDateTime(dateTimeStr: string): Date {
    if (!dateTimeStr) return new Date();

    try {
      const cleaned = dateTimeStr.replace(/"/g, '').trim();
      const parts = cleaned.split(/\s+/);

      const datePart = parts[0];
      const timePart = parts[1] || '00:00:00';
      const ampm = (parts[2] || '').toUpperCase();

      const { day, month, year } = this.parseDatePart(datePart);
      const hour24 = this.parseTimePart(timePart, ampm);
      const { minute, second } = this.parseMinutesAndSeconds(timePart);

      if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
        throw new Error('Invalid date components');
      }

      return new Date(year, month - 1, day, hour24, minute, second);
    } catch (error) {
      console.error('Error parsing date:', dateTimeStr, error);
      return new Date();
    }
  }

  /**
   * Parses the date portion of a Zoom datetime string.
   *
   * Auto-detects DD/MM/YYYY vs MM/DD/YYYY format.
   *
   * @private
   * @param datePart - Date string (e.g., "19/09/2025")
   * @returns Object with day, month, and year
   */
  private parseDatePart(datePart: string): { day: number; month: number; year: number } {
    const [p1, p2, p3] = datePart.split('/').map(v => parseInt(v, 10));
    let day = p1;
    let month = p2;
    const year = p3;

    // Auto-detect DD/MM/YYYY vs MM/DD/YYYY
    if (day > 12 && month <= 12) {
      // Already DD/MM format
    } else if (month > 12 && day <= 12) {
      // Was MM/DD format -> swap
      const tmp = day;
      day = month;
      month = tmp;
    }
    // If both <= 12, assume DD/MM (Italian format)

    return { day, month, year };
  }

  /**
   * Parses the time portion and converts to 24-hour format.
   *
   * @private
   * @param timePart - Time string (e.g., "01:58:39")
   * @param ampm - AM/PM indicator
   * @returns Hour in 24-hour format
   */
  private parseTimePart(timePart: string, ampm: string): number {
    const [hhStr = '0'] = timePart.split(':');
    let hour24 = parseInt(hhStr, 10);

    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }

    return hour24;
  }

  /**
   * Parses minutes and seconds from time string.
   *
   * @private
   * @param timePart - Time string (e.g., "01:58:39")
   * @returns Object with minute and second
   */
  private parseMinutesAndSeconds(timePart: string): { minute: number; second: number } {
    const parts = timePart.split(':');
    return {
      minute: parseInt(parts[1] || '0', 10) || 0,
      second: parseInt(parts[2] || '0', 10) || 0,
    };
  }

  // ============================================================================
  // TIME TRACKING UTILITIES
  // ============================================================================

  /**
   * Updates earliest start time if the given time is earlier.
   *
   * @private
   * @param current - Current earliest time or null
   * @param candidate - Time to compare
   * @returns Updated earliest time
   */
  private updateEarliestTime(current: Date | null, candidate: Date): Date {
    if (!current || candidate < current) {
      return candidate;
    }
    return current;
  }

  /**
   * Updates latest end time if the given time is later.
   *
   * @private
   * @param current - Current latest time or null
   * @param candidate - Time to compare
   * @returns Updated latest time
   */
  private updateLatestTime(current: Date | null, candidate: Date): Date {
    if (!current || candidate > current) {
      return candidate;
    }
    return current;
  }

  // ============================================================================
  // FORMATTING UTILITIES
  // ============================================================================

  /**
   * Formats a Date object as YYYY-MM-DD string.
   *
   * @private
   * @param date - Date to format
   * @returns Formatted date string
   *
   * @example
   * ```ts
   * const formatted = this.formatDate(new Date(2025, 8, 19));
   * // Returns: "2025-09-19"
   * ```
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Cleans participant name by removing parentheses and trimming whitespace.
   *
   * @private
   * @param name - Raw participant name
   * @returns Cleaned name
   *
   * @example
   * ```ts
   * const cleaned = this.cleanParticipantName('John Doe (Organizzatore)');
   * // Returns: "John Doe"
   * ```
   */
  private cleanParticipantName(name: string): string {
    if (!name) return '';
    return name.replace(/\s*\([^)]*\)$/, '').trim();
  }

  /**
   * Generates a unique participant ID from name.
   *
   * @private
   * @param name - Participant name
   * @returns Unique ID string
   *
   * @example
   * ```ts
   * const id = this.generateParticipantId('John Doe');
   * // Returns: "participant_john_doe_1699999999999"
   * ```
   */
  private generateParticipantId(name: string): string {
    return `participant_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of FullCourseParsingService for application-wide use.
 *
 * @example
 * ```ts
 * import { fullCourseParsingService } from './fullCourseParsingService';
 * const data = fullCourseParsingService.parseFullCourseCSV(csvContent);
 * ```
 */
export const fullCourseParsingService = new FullCourseParsingService();
