import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { format } from 'date-fns';
import {
  ParsedFullCourseData,
  FullCourseDayData,
  BatchDocumentResult,
  DayDocumentResult,
} from '../types/course';
import { LessonData, ProcessedParticipant, LessonType, WordTemplateData } from '../types';
import { processParticipants } from '../utils/csvParser';
import { LessonService } from './lessonService';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of participants to include in Word template */
const MAX_PARTICIPANTS_IN_TEMPLATE = 5;

/** Hour threshold for morning/afternoon split (24-hour format) */
const AFTERNOON_START_HOUR = 13;

/** Date format for display (day component) */
const DATE_FORMAT_DAY = 'dd';

/** Date format for display (month component) */
const DATE_FORMAT_MONTH = 'MM';

/** Date format for display (year component) */
const DATE_FORMAT_YEAR = 'yyyy';

/** Time format for participant attendance (HH:mm) */
const TIME_FORMAT = 'HH:mm';

/** Maximum length for sanitized course name in filename */
const MAX_FILENAME_LENGTH = 50;

// ============================================================================
// FULL COURSE DOCUMENT GENERATOR SERVICE
// ============================================================================

/**
 * Service for generating Word documents for full course data.
 *
 * This service handles:
 * - Generating one Word document per day
 * - Converting full course data to lesson data format
 * - Packaging multiple documents into a ZIP file
 * - Progress tracking during batch generation
 *
 * @remarks
 * Reuses existing single-day document generation logic for consistency.
 * Creates ZIP files with sanitized filenames.
 *
 * @example
 * ```ts
 * const result = await generator.generateAllDocuments(
 *   parsedData,
 *   templateFile,
 *   (current, total, date) => console.log(`Processing ${current}/${total}: ${date}`)
 * );
 * if (result.success) {
 *   downloadZip(result.zipData, result.zipFilename);
 * }
 * ```
 */
export class FullCourseDocumentGenerator {
  // ============================================================================
  // BATCH DOCUMENT GENERATION
  // ============================================================================

  /**
   * Generates Word documents for all days and packages them in a ZIP file.
   *
   * @param parsedData - Parsed full course data
   * @param templateFile - Word template file to use
   * @param onProgress - Optional progress callback (current, total, date)
   * @returns Batch result with ZIP file and individual document results
   *
   * @example
   * ```ts
   * const result = await generator.generateAllDocuments(
   *   parsedData,
   *   templateFile,
   *   (current, total, date) => {
   *     console.log(`Processing day ${current}/${total}: ${date}`);
   *   }
   * );
   * ```
   */
  async generateAllDocuments(
    parsedData: ParsedFullCourseData,
    templateFile: File,
    onProgress?: (current: number, total: number, date: string) => void
  ): Promise<BatchDocumentResult> {
    const documents: DayDocumentResult[] = [];
    let totalGenerated = 0;
    let totalFailed = 0;

    // Process each day
    for (let i = 0; i < parsedData.days.length; i++) {
      const day = parsedData.days[i];
      const current = i + 1;
      const total = parsedData.days.length;

      onProgress?.(current, total, day.date);

      const result = await this.processSingleDay(day, parsedData, templateFile);
      documents.push(result);

      if (result.success) {
        totalGenerated++;
      } else {
        totalFailed++;
      }
    }

    // Create ZIP if any documents were generated
    if (totalGenerated > 0) {
      return this.createSuccessfulBatchResult(documents, parsedData, totalGenerated, totalFailed);
    }

    return this.createFailedBatchResult(documents, totalGenerated, totalFailed);
  }

  /**
   * Processes a single day and generates its document.
   *
   * @private
   * @param day - Day data to process
   * @param parsedData - Full course data
   * @param templateFile - Template file
   * @returns Document result for the day
   */
  private async processSingleDay(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData,
    templateFile: File
  ): Promise<DayDocumentResult> {
    try {
      const result = await this.generateDayDocument(day, parsedData, templateFile);
      return result;
    } catch (error) {
      return this.createErrorResult(day, parsedData, error);
    }
  }

  /**
   * Creates a successful batch result with ZIP file.
   *
   * @private
   * @param documents - Array of document results
   * @param parsedData - Full course data
   * @param totalGenerated - Count of successful documents
   * @param totalFailed - Count of failed documents
   * @returns Batch result with ZIP
   */
  private async createSuccessfulBatchResult(
    documents: DayDocumentResult[],
    parsedData: ParsedFullCourseData,
    totalGenerated: number,
    totalFailed: number
  ): Promise<BatchDocumentResult> {
    try {
      const zipData = await this.createZipFile(documents, parsedData.courseName);
      const zipFilename = this.createZipFilename(parsedData);

      return {
        success: true,
        zipFilename,
        zipData,
        documents,
        totalGenerated,
        totalFailed,
      };
    } catch (error) {
      return {
        success: false,
        zipFilename: '',
        documents,
        totalGenerated,
        totalFailed,
      };
    }
  }

  /**
   * Creates a failed batch result.
   *
   * @private
   * @param documents - Array of document results
   * @param totalGenerated - Count of successful documents
   * @param totalFailed - Count of failed documents
   * @returns Failed batch result
   */
  private createFailedBatchResult(
    documents: DayDocumentResult[],
    totalGenerated: number,
    totalFailed: number
  ): BatchDocumentResult {
    return {
      success: false,
      zipFilename: '',
      documents,
      totalGenerated,
      totalFailed,
    };
  }

  /**
   * Creates an error result for a failed day.
   *
   * @private
   * @param day - Day that failed
   * @param parsedData - Course data
   * @param error - Error that occurred
   * @returns Error document result
   */
  private createErrorResult(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData,
    error: unknown
  ): DayDocumentResult {
    return {
      date: day.date,
      filename: `${this.sanitizeCourseName(parsedData.courseName)}_${day.date}.docx`,
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }

  // ============================================================================
  // SINGLE DAY DOCUMENT GENERATION
  // ============================================================================

  /**
   * Generates a Word document for a single day.
   *
   * @private
   * @param day - Day data
   * @param parsedData - Full course data
   * @param templateFile - Template file
   * @returns Document result
   */
  private async generateDayDocument(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData,
    templateFile: File
  ): Promise<DayDocumentResult> {
    try {
      const lessonData = this.convertDayToLessonData(day, parsedData);
      const documentData = await this.generateDocument(lessonData, templateFile);
      const filename = this.createDocumentFilename(parsedData.courseName, day.date);

      return {
        date: day.date,
        filename,
        success: true,
        documentData,
      };
    } catch (error) {
      return {
        date: day.date,
        filename: this.createDocumentFilename(parsedData.courseName, day.date),
        success: false,
        error: error instanceof Error ? error.message : 'Errore generazione documento',
      };
    }
  }

  // ============================================================================
  // DATA CONVERSION
  // ============================================================================

  /**
   * Converts day data to LessonData format for document generation.
   *
   * @private
   * @param day - Day data to convert
   * @param parsedData - Full course data (for participant lookup)
   * @returns Lesson data in format expected by document generator
   */
  private convertDayToLessonData(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData
  ): LessonData {
    // Group sessions by participant
    const participantSessions = this.groupSessionsByParticipant(day, parsedData);

    // Split into morning and afternoon
    const { morningParticipants, afternoonParticipants } =
      this.splitSessionsByPeriod(participantSessions);

    // Process participants using existing logic
    const { participants, organizer } = processParticipants(
      morningParticipants,
      afternoonParticipants
    );

    // Determine lesson type and calculate hours
    const lessonType = this.determineLessonType(
      morningParticipants.length,
      afternoonParticipants.length
    );
    const lessonHours = LessonService.calculateDynamicLessonHours(
      participants,
      organizer,
      lessonType
    );

    return {
      date: new Date(day.date),
      subject: day.courseName,
      courseId: parsedData.zoomMeetingId,
      participants,
      organizer: organizer || undefined,
      lessonType,
      lessonHours,
      actualStartTime: day.startTime,
      actualEndTime: day.endTime,
    };
  }

  /**
   * Groups sessions by participant, handling aliases.
   *
   * @private
   * @param day - Day data
   * @param parsedData - Full course data (for alias resolution)
   * @returns Map of participant name to sessions
   */
  private groupSessionsByParticipant(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData
  ): Map<string, any[]> {
    const participantSessions = new Map<string, any[]>();

    for (const session of day.sessions) {
      const participant = this.findParticipantByName(
        session.participantName,
        parsedData.allParticipants
      );

      if (!participant) continue;

      const participantName = participant.primaryName;

      if (!participantSessions.has(participantName)) {
        participantSessions.set(participantName, []);
      }

      participantSessions.get(participantName)!.push({
        name: participantName,
        email: session.email || participant.email,
        joinTime: session.joinTime,
        leaveTime: session.leaveTime,
        duration: session.duration,
        isGuest: participant.isOrganizer ? false : session.isGuest,
        isOrganizer: participant.isOrganizer,
      });
    }

    return participantSessions;
  }

  /**
   * Splits participant sessions into morning and afternoon periods.
   *
   * @private
   * @param participantSessions - Map of participant to sessions
   * @returns Object with morning and afternoon participant arrays
   */
  private splitSessionsByPeriod(participantSessions: Map<string, any[]>): {
    morningParticipants: any[];
    afternoonParticipants: any[];
  } {
    const morningParticipants: any[] = [];
    const afternoonParticipants: any[] = [];

    for (const [name, sessions] of participantSessions) {
      for (const session of sessions) {
        const hour = session.joinTime.getHours();
        if (hour < AFTERNOON_START_HOUR) {
          morningParticipants.push(session);
        } else {
          afternoonParticipants.push(session);
        }
      }
    }

    return { morningParticipants, afternoonParticipants };
  }

  // ============================================================================
  // DOCUMENT GENERATION
  // ============================================================================

  /**
   * Generates a Word document from lesson data using template.
   *
   * @private
   * @param lessonData - Lesson data to fill into template
   * @param templateFile - Word template file
   * @returns Generated document as ArrayBuffer
   */
  private async generateDocument(
    lessonData: LessonData,
    templateFile: File
  ): Promise<ArrayBuffer> {
    // Read and prepare template
    const templateBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(templateBuffer);

    // Configure docxtemplater
    const doc = this.configureDocxTemplater(zip);

    // Prepare and render data
    const templateData = this.prepareTemplateData(lessonData);
    doc.render(templateData);

    // Generate output
    return doc.getZip().generate({ type: 'arraybuffer' });
  }

  /**
   * Configures Docxtemplater instance.
   *
   * @private
   * @param zip - PizZip instance with template
   * @returns Configured Docxtemplater instance
   */
  private configureDocxTemplater(zip: PizZip): Docxtemplater {
    return new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
      nullGetter: () => '',
      errorLogging: false,
    });
  }

  /**
   * Prepares template data from lesson data.
   *
   * @private
   * @param lessonData - Lesson data
   * @returns Template data object for Word document
   */
  private prepareTemplateData(lessonData: LessonData): WordTemplateData {
    const date = lessonData.date;

    const templateData: WordTemplateData = {
      day: format(date, DATE_FORMAT_DAY),
      month: format(date, DATE_FORMAT_MONTH),
      year: format(date, DATE_FORMAT_YEAR),
      orariolezione: this.getScheduleText(lessonData),
      argomento: lessonData.subject || '',
    };

    // Add participants (up to MAX_PARTICIPANTS_IN_TEMPLATE)
    this.addParticipantsToTemplate(templateData, lessonData.participants);

    return templateData;
  }

  /**
   * Adds participant data to template (up to 5 participants).
   *
   * @private
   * @param templateData - Template data object to populate
   * @param participants - Array of participants
   */
  private addParticipantsToTemplate(
    templateData: WordTemplateData,
    participants: ProcessedParticipant[]
  ): void {
    const sortedParticipants = [...participants]
      .filter(p => !p.isOrganizer)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < MAX_PARTICIPANTS_IN_TEMPLATE; i++) {
      const index = i + 1;
      const participant = sortedParticipants[i];

      if (participant) {
        this.addParticipantFields(templateData, participant, index);
      } else {
        this.addEmptyParticipantFields(templateData, index);
      }
    }
  }

  /**
   * Adds participant fields to template data.
   *
   * @private
   * @param templateData - Template data object
   * @param participant - Participant to add
   * @param index - Participant index (1-5)
   */
  private addParticipantFields(
    templateData: WordTemplateData,
    participant: ProcessedParticipant,
    index: number
  ): void {
    const data = templateData as any;
    data[`partecipante${index}`] = participant.name;
    data[`ingresso${index}m`] = this.formatTime(participant.morningFirstJoin);
    data[`uscita${index}m`] = this.formatTime(participant.morningLastLeave);
    data[`ingresso${index}p`] = this.formatTime(participant.afternoonFirstJoin);
    data[`uscita${index}p`] = this.formatTime(participant.afternoonLastLeave);
    data[`assente${index}`] = participant.isPresent ? '' : 'X';
  }

  /**
   * Adds empty participant fields to template data.
   *
   * @private
   * @param templateData - Template data object
   * @param index - Participant index (1-5)
   */
  private addEmptyParticipantFields(templateData: WordTemplateData, index: number): void {
    const data = templateData as any;
    data[`partecipante${index}`] = '';
    data[`ingresso${index}m`] = '';
    data[`uscita${index}m`] = '';
    data[`ingresso${index}p`] = '';
    data[`uscita${index}p`] = '';
    data[`assente${index}`] = '';
  }

  // ============================================================================
  // ZIP FILE CREATION
  // ============================================================================

  /**
   * Creates a ZIP file containing all successful documents.
   *
   * @private
   * @param documents - Array of document results
   * @param courseName - Course name for ZIP metadata
   * @returns ZIP file as Blob
   */
  private async createZipFile(
    documents: DayDocumentResult[],
    courseName: string
  ): Promise<Blob> {
    const zip = new PizZip();

    // Add successful documents to ZIP
    for (const doc of documents) {
      if (doc.success && doc.documentData) {
        zip.file(doc.filename, doc.documentData);
      }
    }

    // Generate ZIP
    return zip.generate({
      type: 'blob',
      mimeType: 'application/zip',
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Finds a participant by name, handling aliases.
   *
   * @private
   * @param name - Participant name to search for
   * @param participants - Array of participants
   * @returns Participant info or undefined
   */
  private findParticipantByName(name: string, participants: any[]) {
    return participants.find(
      p => p.primaryName === name || p.aliases.includes(name)
    );
  }

  /**
   * Determines lesson type based on participant counts.
   *
   * @private
   * @param morningCount - Number of morning participants
   * @param afternoonCount - Number of afternoon participants
   * @returns Lesson type
   */
  private determineLessonType(morningCount: number, afternoonCount: number): LessonType {
    if (morningCount > 0 && afternoonCount > 0) return 'both';
    if (morningCount > 0) return 'morning';
    if (afternoonCount > 0) return 'afternoon';
    return 'fast';
  }

  /**
   * Generates schedule text from lesson data.
   *
   * @private
   * @param lessonData - Lesson data
   * @returns Formatted schedule string
   *
   * @example
   * ```ts
   * const text = this.getScheduleText(lessonData);
   * // Returns: "09:00 - 13:00 / 14:00 - 18:00"
   * ```
   */
  private getScheduleText(lessonData: LessonData): string {
    const hours = lessonData.lessonHours || [];
    if (hours.length === 0) return '';

    if (hours.length === 2) {
      return `${this.formatHour(hours[0])} - ${this.formatHour(hours[1])}`;
    } else if (hours.length === 4) {
      return `${this.formatHour(hours[0])} - ${this.formatHour(hours[1])} / ${this.formatHour(hours[2])} - ${this.formatHour(hours[3])}`;
    }

    return '';
  }

  /**
   * Formats a decimal hour value as HH:mm.
   *
   * @private
   * @param h - Hour value (e.g., 9.5 = 09:30)
   * @returns Formatted time string
   */
  private formatHour(h: number): string {
    const hour = Math.floor(h);
    const minutes = Math.round((h - hour) * 60);
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  /**
   * Formats a Date object as HH:mm.
   *
   * @private
   * @param date - Date to format
   * @returns Formatted time string or empty if date is undefined
   */
  private formatTime(date?: Date): string {
    if (!date) return '';
    return format(date, TIME_FORMAT);
  }

  // ============================================================================
  // FILENAME UTILITIES
  // ============================================================================

  /**
   * Creates a document filename for a day.
   *
   * @private
   * @param courseName - Course name
   * @param date - Date string
   * @returns Sanitized filename
   */
  private createDocumentFilename(courseName: string, date: string): string {
    return `${this.sanitizeCourseName(courseName)}_${date}.docx`;
  }

  /**
   * Creates a ZIP filename for the full course.
   *
   * @private
   * @param parsedData - Parsed course data
   * @returns Sanitized ZIP filename
   */
  private createZipFilename(parsedData: ParsedFullCourseData): string {
    return `${this.sanitizeCourseName(parsedData.courseName)}_${parsedData.dateRange.start}_${parsedData.dateRange.end}.zip`;
  }

  /**
   * Sanitizes course name for use in filename.
   *
   * @private
   * @param name - Course name to sanitize
   * @returns Sanitized name (alphanumeric, underscores, max 50 chars)
   */
  private sanitizeCourseName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, MAX_FILENAME_LENGTH);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of FullCourseDocumentGenerator for application-wide use.
 *
 * @example
 * ```ts
 * import { fullCourseDocumentGenerator } from './fullCourseDocumentGenerator';
 * const result = await fullCourseDocumentGenerator.generateAllDocuments(
 *   parsedData,
 *   templateFile
 * );
 * ```
 */
export const fullCourseDocumentGenerator = new FullCourseDocumentGenerator();
