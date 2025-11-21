import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import {
  BatchCSVFile,
  DayCSVPair,
  BatchDayResult,
  CompleteBatchResult,
  ProcessedLessonData,
} from '../types/course';
import { LessonData, LessonType, WordTemplateData } from '../types';
import { parseZoomCSV, processParticipants, analyzeCSVPeriod } from '../utils/csvParser';
import { LessonService } from './lessonService';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of participants to display in Word template */
const MAX_PARTICIPANTS_IN_TEMPLATE = 5;

/** Date format for file naming */
const FILE_DATE_FORMAT = 'yyyy-MM-dd';

/** Time format for participant attendance */
const TIME_FORMAT = 'HH:mm';

/** Hour separator in schedule text */
const HOUR_SEPARATOR = ' - ';

/** Session separator in schedule text (morning/afternoon) */
const SESSION_SEPARATOR = ' / ';

/** Maximum filename length for sanitization */
const MAX_FILENAME_LENGTH = 50;

// ============================================================================
// BATCH CSV PROCESSOR SERVICE
// ============================================================================

/**
 * Service for batch processing multiple day-by-day CSV files.
 *
 * This service handles:
 * - Multi-file CSV upload and analysis
 * - Automatic period detection (morning/afternoon)
 * - Date-based file grouping
 * - Batch document generation
 * - ZIP file creation
 *
 * @remarks
 * Reuses existing single-day processing logic for consistency.
 * Each day is processed independently using the same validation
 * and calculation logic as the single-day mode.
 */
export class BatchCSVProcessor {
  // ==========================================================================
  // FILE ANALYSIS
  // ==========================================================================

  /**
   * Analyzes uploaded CSV files and groups them by date.
   *
   * @param files - Array of CSV files to analyze
   * @returns Object containing analyzed files and grouped day pairs
   *
   * @example
   * ```ts
   * const { uploadedFiles, dayPairs } = await processor.analyzeCSVFiles([file1, file2]);
   * console.log(`Found ${dayPairs.length} days`);
   * ```
   */
  async analyzeCSVFiles(files: File[]): Promise<{
    uploadedFiles: BatchCSVFile[];
    dayPairs: DayCSVPair[];
  }> {
    const analyzedFiles = await this.analyzeIndividualFiles(files);
    const dayPairs = this.groupFilesByDate(analyzedFiles);

    return { uploadedFiles: analyzedFiles, dayPairs };
  }

  /**
   * Analyzes each file individually to extract metadata.
   *
   * @private
   * @param files - Files to analyze
   * @returns Array of analyzed file metadata
   */
  private async analyzeIndividualFiles(files: File[]): Promise<BatchCSVFile[]> {
    const analyzedFiles: BatchCSVFile[] = [];

    for (const file of files) {
      const analyzed = await this.analyzeSingleFile(file);
      analyzedFiles.push(analyzed);
    }

    return analyzedFiles;
  }

  /**
   * Analyzes a single CSV file to extract period and date information.
   *
   * @private
   * @param file - CSV file to analyze
   * @returns Analyzed file metadata with period and date detection
   */
  private async analyzeSingleFile(file: File): Promise<BatchCSVFile> {
    try {
      const content = await file.text();
      const analysis = analyzeCSVPeriod(content);
      const participants = parseZoomCSV(content);

      return {
        file,
        fileName: file.name,
        period: this.normalizePeriod(analysis.period),
        detectedDate: this.formatDate(analysis.firstJoinTime),
        participantCount: participants.length,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error analyzing file ${file.name}:`, error);
      return this.createFallbackFileMetadata(file);
    }
  }

  /**
   * Creates fallback metadata for files that couldn't be analyzed.
   *
   * @private
   * @param file - Original file
   * @returns Basic file metadata with unknown period
   */
  private createFallbackFileMetadata(file: File): BatchCSVFile {
    return {
      file,
      fileName: file.name,
      period: 'unknown',
      uploadedAt: new Date(),
    };
  }

  /**
   * Normalizes period string to ensure consistent values.
   *
   * @private
   * @param period - Period string from analysis
   * @returns Normalized period value
   */
  private normalizePeriod(period: string): 'morning' | 'afternoon' | 'unknown' {
    return period === 'unknown' ? 'unknown' : period as 'morning' | 'afternoon';
  }

  // ==========================================================================
  // FILE GROUPING
  // ==========================================================================

  /**
   * Groups analyzed files by date into morning/afternoon pairs.
   *
   * @private
   * @param files - Analyzed files to group
   * @returns Array of day pairs sorted by date
   *
   * @remarks
   * Files with unknown period or missing date are skipped.
   * Days with only morning or only afternoon are marked as incomplete.
   */
  private groupFilesByDate(files: BatchCSVFile[]): DayCSVPair[] {
    const dateMap = this.createDateMap(files);
    return this.sortDayPairsByDate(dateMap);
  }

  /**
   * Creates a map of dates to day pairs.
   *
   * @private
   * @param files - Files to group
   * @returns Map of date strings to day pairs
   */
  private createDateMap(files: BatchCSVFile[]): Map<string, DayCSVPair> {
    const dateMap = new Map<string, DayCSVPair>();

    for (const file of files) {
      if (this.shouldSkipFile(file)) continue;

      this.addFileToDayPair(dateMap, file);
    }

    return dateMap;
  }

  /**
   * Checks if a file should be skipped during grouping.
   *
   * @private
   * @param file - File to check
   * @returns True if file should be skipped
   */
  private shouldSkipFile(file: BatchCSVFile): boolean {
    return !file.detectedDate || file.period === 'unknown';
  }

  /**
   * Adds a file to the appropriate day pair in the map.
   *
   * @private
   * @param dateMap - Map to add file to
   * @param file - File to add
   */
  private addFileToDayPair(dateMap: Map<string, DayCSVPair>, file: BatchCSVFile): void {
    const pair = this.getOrCreateDayPair(dateMap, file.detectedDate!);

    this.assignFileToPeriod(pair, file);
    this.updateDayPairStatus(pair);
  }

  /**
   * Gets existing day pair or creates new one for the date.
   *
   * @private
   * @param dateMap - Map of day pairs
   * @param date - Date string
   * @returns Day pair for the date
   */
  private getOrCreateDayPair(dateMap: Map<string, DayCSVPair>, date: string): DayCSVPair {
    if (!dateMap.has(date)) {
      dateMap.set(date, this.createEmptyDayPair(date));
    }
    return dateMap.get(date)!;
  }

  /**
   * Creates an empty day pair for a date.
   *
   * @private
   * @param date - Date string
   * @returns Empty day pair
   */
  private createEmptyDayPair(date: string): DayCSVPair {
    return {
      date,
      isComplete: false,
      participantCount: 0,
    };
  }

  /**
   * Assigns file to the correct period in day pair.
   *
   * @private
   * @param pair - Day pair to update
   * @param file - File to assign
   */
  private assignFileToPeriod(pair: DayCSVPair, file: BatchCSVFile): void {
    if (file.period === 'morning') {
      pair.morningFile = file;
    } else if (file.period === 'afternoon') {
      pair.afternoonFile = file;
    }
  }

  /**
   * Updates day pair completion status and participant count.
   *
   * @private
   * @param pair - Day pair to update
   */
  private updateDayPairStatus(pair: DayCSVPair): void {
    pair.isComplete = this.isDayPairComplete(pair);
    pair.participantCount = this.getMaxParticipantCount(pair);
  }

  /**
   * Checks if day pair has both morning and afternoon files.
   *
   * @private
   * @param pair - Day pair to check
   * @returns True if both periods are present
   */
  private isDayPairComplete(pair: DayCSVPair): boolean {
    return !!(pair.morningFile && pair.afternoonFile);
  }

  /**
   * Gets maximum participant count from pair's files.
   *
   * @private
   * @param pair - Day pair
   * @returns Maximum participant count
   */
  private getMaxParticipantCount(pair: DayCSVPair): number {
    const morningCount = pair.morningFile?.participantCount || 0;
    const afternoonCount = pair.afternoonFile?.participantCount || 0;
    return Math.max(pair.participantCount, morningCount, afternoonCount);
  }

  /**
   * Sorts day pairs by date in ascending order.
   *
   * @private
   * @param dateMap - Map of day pairs
   * @returns Sorted array of day pairs
   */
  private sortDayPairsByDate(dateMap: Map<string, DayCSVPair>): DayCSVPair[] {
    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  // ==========================================================================
  // BATCH PROCESSING
  // ==========================================================================

  /**
   * Processes all day pairs and generates documents for each.
   *
   * @param dayPairs - Day pairs to process
   * @param templateFile - Word template file
   * @param courseName - Name of the course
   * @param onProgress - Optional progress callback
   * @param onDayComplete - Optional day completion callback
   * @returns Complete batch processing result with ZIP
   *
   * @example
   * ```ts
   * const result = await processor.processAllDays(
   *   dayPairs,
   *   templateFile,
   *   'AI Course',
   *   (current, total) => console.log(`${current}/${total}`)
   * );
   * ```
   */
  async processAllDays(
    dayPairs: DayCSVPair[],
    templateFile: File,
    courseName: string,
    onProgress?: (current: number, total: number, date: string) => void,
    onDayComplete?: (date: string, success: boolean) => void
  ): Promise<CompleteBatchResult> {
    const results = await this.processDaysSequentially(
      dayPairs,
      templateFile,
      courseName,
      onProgress,
      onDayComplete
    );

    return this.createBatchResult(results, dayPairs, courseName);
  }

  /**
   * Processes day pairs sequentially with progress tracking.
   *
   * @private
   * @param dayPairs - Pairs to process
   * @param templateFile - Template file
   * @param courseName - Course name
   * @param onProgress - Progress callback
   * @param onDayComplete - Completion callback
   * @returns Array of day results
   */
  private async processDaysSequentially(
    dayPairs: DayCSVPair[],
    templateFile: File,
    courseName: string,
    onProgress?: (current: number, total: number, date: string) => void,
    onDayComplete?: (date: string, success: boolean) => void
  ): Promise<BatchDayResult[]> {
    const results: BatchDayResult[] = [];
    const total = dayPairs.length;

    for (let i = 0; i < total; i++) {
      const pair = dayPairs[i];
      const current = i + 1;

      onProgress?.(current, total, pair.date);

      const result = await this.processDay(pair, templateFile, courseName);
      results.push(result);

      onDayComplete?.(pair.date, result.success);
    }

    return results;
  }

  /**
   * Processes a single day pair.
   *
   * @private
   * @param pair - Day pair to process
   * @param templateFile - Template file
   * @param courseName - Course name
   * @returns Day processing result
   */
  private async processDay(
    pair: DayCSVPair,
    templateFile: File,
    courseName: string
  ): Promise<BatchDayResult> {
    try {
      return await this.processSingleDay(pair, templateFile, courseName);
    } catch (error) {
      return this.createErrorResult(pair.date, error);
    }
  }

  /**
   * Creates error result for failed day processing.
   *
   * @private
   * @param date - Date of failed processing
   * @param error - Error that occurred
   * @returns Error result
   */
  private createErrorResult(date: string, error: unknown): BatchDayResult {
    return {
      date,
      success: false,
      documentGenerated: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }

  /**
   * Creates complete batch result from day results.
   *
   * @private
   * @param dayResults - Individual day results
   * @param dayPairs - Original day pairs
   * @param courseName - Course name
   * @returns Complete batch result
   */
  private async createBatchResult(
    dayResults: BatchDayResult[],
    dayPairs: DayCSVPair[],
    courseName: string
  ): Promise<CompleteBatchResult> {
    const successfulDays = dayResults.filter(r => r.success).length;
    const failedDays = dayResults.filter(r => !r.success).length;

    let zipData: Blob | undefined;
    let zipFilename: string | undefined;

    if (successfulDays > 0) {
      const zipResult = await this.createZIPFileIfPossible(dayResults, courseName);
      zipData = zipResult.zipBlob;
      zipFilename = zipResult.filename;
    }

    return {
      success: successfulDays > 0,
      totalDays: dayPairs.length,
      successfulDays,
      failedDays,
      dayResults,
      zipFilename,
      zipData,
      courseName,
      dateRange: this.calculateDateRange(dayPairs),
    };
  }

  /**
   * Calculates date range from day pairs.
   *
   * @private
   * @param dayPairs - Day pairs
   * @returns Date range or undefined
   */
  private calculateDateRange(dayPairs: DayCSVPair[]): { start: string; end: string } | undefined {
    if (dayPairs.length === 0) return undefined;

    const dates = dayPairs.map(p => p.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  }

  // ==========================================================================
  // SINGLE DAY PROCESSING
  // ==========================================================================

  /**
   * Processes a single day using existing single-day logic.
   *
   * @private
   * @param pair - Day pair to process
   * @param templateFile - Template file
   * @param courseName - Course name
   * @returns Day result with generated document
   *
   * @remarks
   * This method reuses all existing single-day processing logic:
   * - CSV parsing
   * - Participant processing
   * - Absence calculation
   * - Document generation
   */
  private async processSingleDay(
    pair: DayCSVPair,
    templateFile: File,
    courseName: string
  ): Promise<BatchDayResult> {
    const { morningParticipants, afternoonParticipants } = await this.parseCSVFiles(pair);
    const { participants, organizer } = processParticipants(morningParticipants, afternoonParticipants);

    const lessonType = this.determineLessonType(morningParticipants.length, afternoonParticipants.length);
    const lessonHours = LessonService.calculateDynamicLessonHours(participants, organizer, lessonType);

    const lessonData: LessonData = {
      date: new Date(pair.date),
      subject: courseName,
      courseId: pair.date.replace(/-/g, ''),
      participants,
      organizer: organizer || undefined,
      lessonType,
      lessonHours,
    };

    await this.generateDocument(lessonData, templateFile);

    const processedData: ProcessedLessonData = {
      ...lessonData,
      courseId: pair.date.replace(/-/g, ''),
      dayNumber: 1,
      isProcessed: true,
      hasManualAdjustments: false,
    };

    return {
      date: pair.date,
      success: true,
      lessonData: processedData,
      documentGenerated: true,
      documentFilename: this.createDocumentFilename(courseName, pair.date),
      participantCount: participants.length,
    };
  }

  /**
   * Parses CSV files from a day pair.
   *
   * @private
   * @param pair - Day pair with CSV files
   * @returns Morning and afternoon participants
   */
  private async parseCSVFiles(pair: DayCSVPair): Promise<{
    morningParticipants: any[];
    afternoonParticipants: any[];
  }> {
    const morningParticipants = pair.morningFile
      ? parseZoomCSV(await pair.morningFile.file.text())
      : [];

    const afternoonParticipants = pair.afternoonFile
      ? parseZoomCSV(await pair.afternoonFile.file.text())
      : [];

    return { morningParticipants, afternoonParticipants };
  }

  // ==========================================================================
  // DOCUMENT GENERATION
  // ==========================================================================

  /**
   * Generates Word document from lesson data.
   *
   * @private
   * @param lessonData - Lesson data
   * @param templateFile - Template file
   * @returns Generated document as ArrayBuffer
   */
  private async generateDocument(
    lessonData: LessonData,
    templateFile: File
  ): Promise<ArrayBuffer> {
    const templateBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(templateBuffer);

    const doc = this.configureDocxtemplater(zip);
    const templateData = this.prepareTemplateData(lessonData);

    doc.render(templateData);

    return doc.getZip().generate({ type: 'arraybuffer' });
  }

  /**
   * Configures Docxtemplater instance.
   *
   * @private
   * @param zip - PizZip instance
   * @returns Configured Docxtemplater
   */
  private configureDocxtemplater(zip: PizZip): Docxtemplater {
    return new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
      errorLogging: false,
    });
  }

  /**
   * Prepares template data for Word document.
   *
   * @private
   * @param lessonData - Lesson data
   * @returns Template data object
   */
  private prepareTemplateData(lessonData: LessonData): WordTemplateData {
    const baseData = this.prepareBaseTemplateData(lessonData);
    const participantsData = this.prepareParticipantsData(lessonData.participants);

    return { ...baseData, ...participantsData } as WordTemplateData;
  }

  /**
   * Prepares base template data (date, schedule, subject).
   *
   * @private
   * @param lessonData - Lesson data
   * @returns Base template data
   */
  private prepareBaseTemplateData(lessonData: LessonData): Partial<WordTemplateData> {
    return {
      day: format(lessonData.date, 'dd'),
      month: format(lessonData.date, 'MM'),
      year: format(lessonData.date, 'yyyy'),
      orariolezione: this.getScheduleText(lessonData),
      argomento: lessonData.subject || '',
    };
  }

  /**
   * Prepares participants data for template.
   *
   * @private
   * @param participants - Array of participants
   * @returns Participants template data
   */
  private prepareParticipantsData(participants: any[]): Partial<WordTemplateData> {
    const data: Partial<WordTemplateData> = {};
    const sorted = this.sortParticipants(participants);

    for (let i = 0; i < MAX_PARTICIPANTS_IN_TEMPLATE; i++) {
      const index = i + 1;
      const participant = sorted[i];

      if (participant) {
        this.addParticipantToTemplate(data, participant, index);
      } else {
        this.addEmptyParticipantToTemplate(data, index);
      }
    }

    return data;
  }

  /**
   * Sorts participants alphabetically, excluding organizer.
   *
   * @private
   * @param participants - Participants to sort
   * @returns Sorted participants
   */
  private sortParticipants(participants: any[]): any[] {
    return [...participants]
      .filter(p => !p.isOrganizer)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Adds participant data to template.
   *
   * @private
   * @param data - Template data object
   * @param participant - Participant to add
   * @param index - Participant index (1-5)
   */
  private addParticipantToTemplate(
    data: Partial<WordTemplateData>,
    participant: any,
    index: number
  ): void {
    const templateData = data as any;
    templateData[`partecipante${index}`] = participant.name;
    templateData[`ingresso${index}m`] = this.formatTime(participant.morningFirstJoin);
    templateData[`uscita${index}m`] = this.formatTime(participant.morningLastLeave);
    templateData[`ingresso${index}p`] = this.formatTime(participant.afternoonFirstJoin);
    templateData[`uscita${index}p`] = this.formatTime(participant.afternoonLastLeave);
    templateData[`assente${index}`] = participant.isPresent ? '' : 'X';
  }

  /**
   * Adds empty participant slot to template.
   *
   * @private
   * @param data - Template data object
   * @param index - Participant index (1-5)
   */
  private addEmptyParticipantToTemplate(data: Partial<WordTemplateData>, index: number): void {
    const templateData = data as any;
    templateData[`partecipante${index}`] = '';
    templateData[`ingresso${index}m`] = '';
    templateData[`uscita${index}m`] = '';
    templateData[`ingresso${index}p`] = '';
    templateData[`uscita${index}p`] = '';
    templateData[`assente${index}`] = '';
  }

  // ==========================================================================
  // ZIP FILE CREATION
  // ==========================================================================

  /**
   * Creates ZIP file with all documents if possible.
   *
   * @private
   * @param dayResults - Day results
   * @param courseName - Course name
   * @returns ZIP blob and filename, or empty values
   */
  private async createZIPFileIfPossible(
    dayResults: BatchDayResult[],
    courseName: string
  ): Promise<{ zipBlob?: Blob; filename?: string }> {
    try {
      return await this.createZIPFile(dayResults, courseName);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      return {};
    }
  }

  /**
   * Creates ZIP file containing all generated documents.
   *
   * @private
   * @param dayResults - Day results
   * @param courseName - Course name
   * @returns ZIP blob and filename
   */
  private async createZIPFile(
    dayResults: BatchDayResult[],
    courseName: string
  ): Promise<{ zipBlob: Blob; filename: string }> {
    const zip = new PizZip();
    const dates = this.getSuccessfulDates(dayResults);
    const filename = this.createZIPFilename(courseName, dates);

    // Note: In actual implementation, document data would be stored
    // and added to ZIP here. Currently placeholder.

    const zipBlob = zip.generate({
      type: 'blob',
      mimeType: 'application/zip',
    });

    return { zipBlob, filename };
  }

  /**
   * Gets dates of successfully processed days.
   *
   * @private
   * @param dayResults - Day results
   * @returns Sorted array of dates
   */
  private getSuccessfulDates(dayResults: BatchDayResult[]): string[] {
    return dayResults
      .filter(r => r.success)
      .map(r => r.date)
      .sort();
  }

  /**
   * Creates ZIP filename from course name and dates.
   *
   * @private
   * @param courseName - Course name
   * @param dates - Array of dates
   * @returns ZIP filename
   */
  private createZIPFilename(courseName: string, dates: string[]): string {
    const dateRange = dates.length > 0
      ? `${dates[0]}_${dates[dates.length - 1]}`
      : 'corso';

    return `${this.sanitizeFilename(courseName)}_${dateRange}.zip`;
  }

  /**
   * Downloads ZIP file to user's browser.
   *
   * @param zipData - ZIP blob
   * @param filename - Filename for download
   */
  downloadZIP(zipData: Blob, filename: string): void {
    saveAs(zipData, filename);
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

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
   * Creates schedule text from lesson data.
   *
   * @private
   * @param lessonData - Lesson data
   * @returns Formatted schedule text
   */
  private getScheduleText(lessonData: LessonData): string {
    const hours = lessonData.lessonHours || [];
    if (hours.length === 0) return '';

    if (hours.length === 2) {
      return this.formatHourRange(hours[0], hours[1]);
    } else if (hours.length === 4) {
      return this.formatDualHourRange(hours[0], hours[1], hours[2], hours[3]);
    }

    return '';
  }

  /**
   * Formats single hour range.
   *
   * @private
   * @param start - Start hour
   * @param end - End hour
   * @returns Formatted range
   */
  private formatHourRange(start: number, end: number): string {
    return `${this.formatHour(start)}${HOUR_SEPARATOR}${this.formatHour(end)}`;
  }

  /**
   * Formats dual hour range (morning and afternoon).
   *
   * @private
   * @param morningStart - Morning start
   * @param morningEnd - Morning end
   * @param afternoonStart - Afternoon start
   * @param afternoonEnd - Afternoon end
   * @returns Formatted dual range
   */
  private formatDualHourRange(
    morningStart: number,
    morningEnd: number,
    afternoonStart: number,
    afternoonEnd: number
  ): string {
    const morning = this.formatHourRange(morningStart, morningEnd);
    const afternoon = this.formatHourRange(afternoonStart, afternoonEnd);
    return `${morning}${SESSION_SEPARATOR}${afternoon}`;
  }

  /**
   * Formats decimal hour to HH:MM string.
   *
   * @private
   * @param hour - Decimal hour (e.g., 9.5 for 9:30)
   * @returns Formatted time string
   */
  private formatHour(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Formats Date to time string.
   *
   * @private
   * @param date - Date to format
   * @returns Time string or empty if date is undefined
   */
  private formatTime(date?: Date): string {
    return date ? format(date, TIME_FORMAT) : '';
  }

  /**
   * Formats Date to date string.
   *
   * @private
   * @param date - Date to format
   * @returns Date string in YYYY-MM-DD format
   */
  private formatDate(date: Date): string {
    return format(date, FILE_DATE_FORMAT);
  }

  /**
   * Sanitizes filename by removing invalid characters.
   *
   * @private
   * @param name - Filename to sanitize
   * @returns Sanitized filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, MAX_FILENAME_LENGTH);
  }

  /**
   * Creates document filename.
   *
   * @private
   * @param courseName - Course name
   * @param date - Date string
   * @returns Document filename
   */
  private createDocumentFilename(courseName: string, date: string): string {
    return `${this.sanitizeFilename(courseName)}_${date}.docx`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Singleton instance of BatchCSVProcessor for application-wide use.
 *
 * @example
 * ```ts
 * import { batchCSVProcessor } from './services/batchCSVProcessor';
 *
 * const result = await batchCSVProcessor.processAllDays(dayPairs, template, 'Course');
 * ```
 */
export const batchCSVProcessor = new BatchCSVProcessor();
