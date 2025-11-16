import { fullCourseParsingService } from './fullCourseParsingService';
import { aliasManagementService } from './aliasManagementService';
import { ParsedFullCourseData } from '../types/course';

/**
 * High-level service that orchestrates full course processing
 * Combines parsing, alias detection, and automatic merging
 */
export class FullCourseProcessor {
  /**
   * Process a full course CSV file
   * Returns parsed data with aliases automatically detected and merged
   */
  async processFullCourseCSV(csvContent: string): Promise<ParsedFullCourseData> {
    // Step 1: Parse CSV
    console.log('📄 Parsing CSV...');
    const parsedData = fullCourseParsingService.parseFullCourseCSV(csvContent);

    console.log(`✅ Parsed ${parsedData.statistics.totalDays} days, ${parsedData.statistics.totalParticipants} participants`);

    // Step 2: Detect aliases
    console.log('🔍 Detecting aliases...');
    const aliasSuggestions = aliasManagementService.detectAliases(parsedData.allParticipants);

    console.log(`✅ Found ${aliasSuggestions.length} alias suggestions`);

    // Log auto-merged aliases
    const autoMerged = aliasSuggestions.filter(s => s.autoMerged);
    if (autoMerged.length > 0) {
      console.log(`🔀 Auto-merging ${autoMerged.length} participants:`);
      autoMerged.forEach(suggestion => {
        console.log(`  • ${suggestion.mainName} ← [${suggestion.suggestedAliases.join(', ')}] (confidence: ${(suggestion.confidence * 100).toFixed(1)}%)`);
      });
    }

    // Step 3: Apply alias mappings
    console.log('🔄 Applying alias mappings...');
    const { mergedParticipants, mappings } = aliasManagementService.applyAliasMappings(
      parsedData.allParticipants,
      aliasSuggestions
    );

    console.log(`✅ Merged to ${mergedParticipants.length} unique participants`);

    // Step 4: Update parsed data
    parsedData.allParticipants = mergedParticipants;
    parsedData.aliasSuggestions = aliasSuggestions;
    parsedData.statistics.totalParticipants = mergedParticipants.length;

    return parsedData;
  }

  /**
   * Get processing summary for display
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
    const autoMergedCount = parsedData.aliasSuggestions.filter(s => s.autoMerged).length;
    const participantNames = parsedData.allParticipants
      .filter(p => !p.isOrganizer)
      .map(p => p.primaryName);

    return {
      courseName: parsedData.courseName,
      dateRange: `${parsedData.dateRange.start} - ${parsedData.dateRange.end}`,
      totalDays: parsedData.statistics.totalDays,
      totalParticipants: parsedData.statistics.totalParticipants,
      totalSessions: parsedData.statistics.totalSessions,
      organizerName: parsedData.organizer.name,
      participantNames,
      autoMergedCount,
    };
  }

  /**
   * Get detailed day information
   */
  getDayDetails(parsedData: ParsedFullCourseData, date: string) {
    const day = parsedData.days.find(d => d.date === date);
    if (!day) return null;

    const participantsList = Array.from(day.participantNames).sort();
    const sessionCount = day.sessions.length;
    const duration = (day.endTime.getTime() - day.startTime.getTime()) / (1000 * 60); // minutes

    return {
      date: day.date,
      startTime: day.startTime,
      endTime: day.endTime,
      duration: Math.round(duration),
      participantCount: participantsList.length,
      participants: participantsList,
      sessionCount,
    };
  }

  /**
   * Get participant statistics
   */
  getParticipantStats(parsedData: ParsedFullCourseData, participantId: string) {
    const participant = parsedData.allParticipants.find(p => p.id === participantId);
    if (!participant) return null;

    const totalDays = parsedData.statistics.totalDays;
    const daysPresent = participant.daysPresent.length;
    const daysAbsent = totalDays - daysPresent;
    const attendanceRate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 0;

    return {
      name: participant.primaryName,
      aliases: participant.aliases,
      email: participant.email,
      totalDays,
      daysPresent,
      daysAbsent,
      attendanceRate: Math.round(attendanceRate),
      presentDates: participant.daysPresent,
    };
  }

  /**
   * Validate parsed data
   */
  validateParsedData(parsedData: ParsedFullCourseData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic data
    if (!parsedData.courseName) {
      errors.push('Nome corso mancante');
    }

    if (parsedData.days.length === 0) {
      errors.push('Nessun giorno trovato nel CSV');
    }

    if (parsedData.allParticipants.length === 0) {
      errors.push('Nessun partecipante trovato');
    }

    // Check organizer
    const hasOrganizer = parsedData.allParticipants.some(p => p.isOrganizer);
    if (!hasOrganizer) {
      warnings.push('Organizzatore non identificato');
    }

    // Check for participants with no email
    const noEmailCount = parsedData.allParticipants.filter(
      p => !p.isOrganizer && !p.email
    ).length;
    if (noEmailCount > 0) {
      warnings.push(`${noEmailCount} partecipanti senza email`);
    }

    // Check for days with very few participants
    const sparseDays = parsedData.days.filter(d => d.participantNames.size < 3);
    if (sparseDays.length > 0) {
      warnings.push(`${sparseDays.length} giorni con meno di 3 partecipanti`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Singleton instance
export const fullCourseProcessor = new FullCourseProcessor();
