import { fullCourseParsingService } from './fullCourseParsingService';
import { aliasManagementService } from './aliasManagementService';
import { ParsedFullCourseData } from '../types/course';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum number of participants to avoid sparse day warning */
const MIN_PARTICIPANTS_PER_DAY = 3;

/** Percentage multiplier for attendance rate calculation */
const PERCENTAGE_MULTIPLIER = 100;

/** Milliseconds to minutes conversion factor */
const MS_TO_MINUTES = 1000 * 60;

// ============================================================================
// FULL COURSE PROCESSOR SERVICE
// ============================================================================

/**
 * High-level orchestrator service for full course processing.
 *
 * This service coordinates:
 * - CSV parsing through fullCourseParsingService
 * - Alias detection through aliasManagementService
 * - Automatic alias merging
 * - Data validation
 * - Statistics generation
 *
 * @remarks
 * Acts as a facade that simplifies the multi-step process of handling
 * a full course CSV file. Provides logging and progress feedback.
 *
 * @example
 * ```ts
 * const csvContent = await file.text();
 * const parsedData = await fullCourseProcessor.processFullCourseCSV(csvContent);
 * const summary = fullCourseProcessor.getProcessingSummary(parsedData);
 * ```
 */
export class FullCourseProcessor {
  // ============================================================================
  // MAIN PROCESSING
  // ============================================================================

  /**
   * Processes a full course CSV file from start to finish.
   *
   * Processing steps:
   * 1. Parse CSV file
   * 2. Detect participant aliases
   * 3. Auto-merge high-confidence aliases
   * 4. Update statistics
   *
   * @param csvContent - Raw CSV content as string
   * @returns Parsed course data with merged participants
   *
   * @example
   * ```ts
   * const parsedData = await processor.processFullCourseCSV(csvContent);
   * console.log(`Processed ${parsedData.statistics.totalDays} days`);
   * ```
   */
  async processFullCourseCSV(csvContent: string): Promise<ParsedFullCourseData> {
    // Step 1: Parse CSV
    const parsedData = this.parseCSV(csvContent);

    // Step 2: Detect and apply aliases
    const aliasSuggestions = this.detectAliases(parsedData);

    // Step 3: Merge aliases
    this.mergeAliases(parsedData, aliasSuggestions);

    // Step 4: Update final data
    this.updateParsedData(parsedData, aliasSuggestions);

    const hasParticipants = parsedData.allParticipants.some(p => !p.isOrganizer);
    if (!hasParticipants) {
      throw new Error('Nessun partecipante trovato nel file CSV');
    }

    return parsedData;
  }

  /**
   * Parses the CSV content using the parsing service.
   *
   * @private
   * @param csvContent - Raw CSV string
   * @returns Parsed course data
   */
  private parseCSV(csvContent: string): ParsedFullCourseData {
    console.log('📄 Parsing CSV...');
    const parsedData = fullCourseParsingService.parseFullCourseCSV(csvContent);

    console.log(
      `✅ Parsed ${parsedData.statistics.totalDays} days, ` +
      `${parsedData.statistics.totalParticipants} participants`
    );

    return parsedData;
  }

  /**
   * Detects aliases among participants.
   *
   * @private
   * @param parsedData - Parsed course data
   * @returns Array of alias suggestions
   */
  private detectAliases(parsedData: ParsedFullCourseData) {
    console.log('🔍 Detecting aliases...');
    const aliasSuggestions = aliasManagementService.detectAliases(parsedData.allParticipants);

    console.log(`✅ Found ${aliasSuggestions.length} alias suggestions`);

    this.logAutoMergedAliases(aliasSuggestions);

    return aliasSuggestions;
  }

  /**
   * Logs auto-merged alias suggestions to console.
   *
   * @private
   * @param aliasSuggestions - Array of alias suggestions
   */
  private logAutoMergedAliases(aliasSuggestions: any[]): void {
    const autoMerged = aliasSuggestions.filter(s => s.autoMerged);

    if (autoMerged.length > 0) {
      console.log(`🔀 Auto-merging ${autoMerged.length} participants:`);
      autoMerged.forEach(suggestion => {
        const confidencePercent = (suggestion.confidence * PERCENTAGE_MULTIPLIER).toFixed(1);
        console.log(
          `  • ${suggestion.mainName} ← [${suggestion.suggestedAliases.join(', ')}] ` +
          `(confidence: ${confidencePercent}%)`
        );
      });
    }
  }

  /**
   * Merges aliases into the parsed data.
   *
   * @private
   * @param parsedData - Parsed course data
   * @param aliasSuggestions - Alias suggestions to apply
   */
  private mergeAliases(
    parsedData: ParsedFullCourseData,
    aliasSuggestions: any[]
  ): void {
    console.log('🔄 Applying alias mappings...');

    const { mergedParticipants } = aliasManagementService.applyAliasMappings(
      parsedData.allParticipants,
      aliasSuggestions
    );

    parsedData.allParticipants = mergedParticipants;

    console.log(`✅ Merged to ${mergedParticipants.length} unique participants`);
  }

  /**
   * Updates parsed data with final alias information.
   *
   * @private
   * @param parsedData - Parsed course data to update
   * @param aliasSuggestions - Alias suggestions
   */
  private updateParsedData(
    parsedData: ParsedFullCourseData,
    aliasSuggestions: any[]
  ): void {
    parsedData.aliasSuggestions = aliasSuggestions;
    parsedData.statistics.totalParticipants = parsedData.allParticipants.length;
  }

  // ============================================================================
  // SUMMARY GENERATION
  // ============================================================================

  /**
   * Generates a processing summary for display purposes.
   *
   * @param parsedData - Parsed course data
   * @returns Summary object with key metrics
   *
   * @example
   * ```ts
   * const summary = processor.getProcessingSummary(parsedData);
   * console.log(`Course: ${summary.courseName}`);
   * console.log(`Date Range: ${summary.dateRange}`);
   * console.log(`Auto-merged: ${summary.autoMergedCount} participants`);
   * ```
   */
  getProcessingSummary(parsedData: ParsedFullCourseData): {
    courseName: string;
    dateRange: string;
    totalDays: number;
    totalParticipants: number;
    totalSessions: number;
    organizerName: string;
    participantNames: string[];
    autoMergedCount: number;
  } {
    const autoMergedCount = this.countAutoMergedParticipants(parsedData);
    const participantNames = this.extractParticipantNames(parsedData);

    return {
      courseName: parsedData.courseName,
      dateRange: this.formatDateRange(parsedData),
      totalDays: parsedData.statistics.totalDays,
      totalParticipants: parsedData.statistics.totalParticipants,
      totalSessions: parsedData.statistics.totalSessions,
      organizerName: parsedData.organizer.name,
      participantNames,
      autoMergedCount,
    };
  }

  /**
   * Counts auto-merged participants from alias suggestions.
   *
   * @private
   * @param parsedData - Parsed course data
   * @returns Count of auto-merged participants
   */
  private countAutoMergedParticipants(parsedData: ParsedFullCourseData): number {
    return parsedData.aliasSuggestions.filter(s => s.autoMerged).length;
  }

  /**
   * Extracts participant names (excluding organizer).
   *
   * @private
   * @param parsedData - Parsed course data
   * @returns Array of participant names
   */
  private extractParticipantNames(parsedData: ParsedFullCourseData): string[] {
    return parsedData.allParticipants
      .filter(p => !p.isOrganizer)
      .map(p => p.primaryName);
  }

  /**
   * Formats date range as a readable string.
   *
   * @private
   * @param parsedData - Parsed course data
   * @returns Formatted date range string
   */
  private formatDateRange(parsedData: ParsedFullCourseData): string {
    return `${parsedData.dateRange.start} - ${parsedData.dateRange.end}`;
  }

  // ============================================================================
  // DAY DETAILS
  // ============================================================================

  /**
   * Retrieves detailed information about a specific day.
   *
   * @param parsedData - Parsed course data
   * @param date - Date string to get details for (YYYY-MM-DD)
   * @returns Day details object, or null if date not found
   *
   * @example
   * ```ts
   * const details = processor.getDayDetails(parsedData, '2025-09-19');
   * if (details) {
   *   console.log(`Duration: ${details.duration} minutes`);
   *   console.log(`Participants: ${details.participantCount}`);
   * }
   * ```
   */
  getDayDetails(parsedData: ParsedFullCourseData, date: string): {
    date: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    participantCount: number;
    participants: string[];
    sessionCount: number;
  } | null {
    const day = parsedData.days.find(d => d.date === date);
    if (!day) return null;

    return {
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
      duration: this.calculateDuration(day.startTime, day.endTime),
      participantCount: day.participantNames.size,
      participants: Array.from(day.participantNames).sort(),
      sessionCount: day.sessions.length,
    };
  }

  /**
   * Calculates duration between two times in minutes.
   *
   * @private
   * @param startTime - Start time
   * @param endTime - End time
   * @returns Duration in minutes (rounded)
   */
  private calculateDuration(startTime: Date, endTime: Date): number {
    const durationMs = endTime.getTime() - startTime.getTime();
    return Math.round(durationMs / MS_TO_MINUTES);
  }

  // ============================================================================
  // PARTICIPANT STATISTICS
  // ============================================================================

  /**
   * Retrieves statistics for a specific participant.
   *
   * @param parsedData - Parsed course data
   * @param participantId - Participant ID to get stats for
   * @returns Participant statistics object, or null if not found
   *
   * @example
   * ```ts
   * const stats = processor.getParticipantStats(parsedData, participantId);
   * if (stats) {
   *   console.log(`${stats.name}: ${stats.attendanceRate}% attendance`);
   *   console.log(`Present: ${stats.daysPresent}/${stats.totalDays} days`);
   * }
   * ```
   */
  getParticipantStats(parsedData: ParsedFullCourseData, participantId: string): {
    name: string;
    aliases: string[];
    email: string;
    totalDays: number;
    daysPresent: number;
    daysAbsent: number;
    attendanceRate: number;
    presentDates: string[];
  } | null {
    const participant = parsedData.allParticipants.find(p => p.id === participantId);
    if (!participant) return null;

    const totalDays = parsedData.statistics.totalDays;
    const daysPresent = participant.daysPresent.length;
    const daysAbsent = totalDays - daysPresent;
    const attendanceRate = this.calculateAttendanceRate(daysPresent, totalDays);

    return {
      name: participant.primaryName,
      aliases: participant.aliases,
      email: participant.email,
      totalDays,
      daysPresent,
      daysAbsent,
      attendanceRate,
      presentDates: participant.daysPresent,
    };
  }

  /**
   * Calculates attendance rate as a percentage.
   *
   * @private
   * @param daysPresent - Number of days present
   * @param totalDays - Total number of days
   * @returns Attendance rate percentage (rounded)
   */
  private calculateAttendanceRate(daysPresent: number, totalDays: number): number {
    if (totalDays === 0) return 0;
    const rate = (daysPresent / totalDays) * PERCENTAGE_MULTIPLIER;
    return Math.round(rate);
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validates parsed course data for completeness and correctness.
   *
   * Checks for:
   * - Missing course name
   * - Empty days
   * - Missing participants
   * - Missing organizer
   * - Participants without email
   * - Days with very few participants
   *
   * @param parsedData - Parsed course data to validate
   * @returns Validation result with errors and warnings
   *
   * @example
   * ```ts
   * const validation = processor.validateParsedData(parsedData);
   * if (!validation.isValid) {
   *   console.error('Errors:', validation.errors);
   * }
   * if (validation.warnings.length > 0) {
   *   console.warn('Warnings:', validation.warnings);
   * }
   * ```
   */
  validateParsedData(parsedData: ParsedFullCourseData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateBasicData(parsedData, errors);
    this.validateOrganizer(parsedData, warnings);
    this.validateParticipantEmails(parsedData, warnings);
    this.validateDayParticipation(parsedData, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates basic required data fields.
   *
   * @private
   * @param parsedData - Parsed course data
   * @param errors - Array to add errors to
   */
  private validateBasicData(parsedData: ParsedFullCourseData, errors: string[]): void {
    if (!parsedData.courseName) {
      errors.push('Nome corso mancante');
    }

    if (parsedData.days.length === 0) {
      errors.push('Nessun giorno trovato nel CSV');
    }

    if (parsedData.allParticipants.length === 0) {
      errors.push('Nessun partecipante trovato');
    }
  }

  /**
   * Validates that an organizer exists.
   *
   * @private
   * @param parsedData - Parsed course data
   * @param warnings - Array to add warnings to
   */
  private validateOrganizer(parsedData: ParsedFullCourseData, warnings: string[]): void {
    const hasOrganizer = parsedData.allParticipants.some(p => p.isOrganizer);
    if (!hasOrganizer) {
      warnings.push('Organizzatore non identificato');
    }
  }

  /**
   * Validates participant email addresses.
   *
   * @private
   * @param parsedData - Parsed course data
   * @param warnings - Array to add warnings to
   */
  private validateParticipantEmails(parsedData: ParsedFullCourseData, warnings: string[]): void {
    const noEmailCount = parsedData.allParticipants.filter(
      p => !p.isOrganizer && !p.email
    ).length;

    if (noEmailCount > 0) {
      warnings.push(`${noEmailCount} partecipanti senza email`);
    }
  }

  /**
   * Validates day participation levels.
   *
   * @private
   * @param parsedData - Parsed course data
   * @param warnings - Array to add warnings to
   */
  private validateDayParticipation(parsedData: ParsedFullCourseData, warnings: string[]): void {
    const sparseDays = parsedData.days.filter(
      d => d.participantNames.size < MIN_PARTICIPANTS_PER_DAY
    );

    if (sparseDays.length > 0) {
      warnings.push(`${sparseDays.length} giorni con meno di ${MIN_PARTICIPANTS_PER_DAY} partecipanti`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of FullCourseProcessor for application-wide use.
 *
 * @example
 * ```ts
 * import { fullCourseProcessor } from './fullCourseProcessor';
 * const parsedData = await fullCourseProcessor.processFullCourseCSV(csvContent);
 * ```
 */
export const fullCourseProcessor = new FullCourseProcessor();
