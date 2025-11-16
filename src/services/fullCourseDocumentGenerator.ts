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

/**
 * Service for generating Word documents for full course
 * Generates one document per day and packages them in a ZIP file
 */
export class FullCourseDocumentGenerator {
  /**
   * Generate documents for all days and create a ZIP file
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

      try {
        const result = await this.generateDayDocument(
          day,
          parsedData,
          templateFile
        );

        documents.push(result);
        if (result.success) {
          totalGenerated++;
        } else {
          totalFailed++;
        }
      } catch (error) {
        documents.push({
          date: day.date,
          filename: `${this.sanitizeCourseName(parsedData.courseName)}_${day.date}.docx`,
          success: false,
          error: error instanceof Error ? error.message : 'Errore sconosciuto',
        });
        totalFailed++;
      }
    }

    // Create ZIP if any documents were generated
    if (totalGenerated > 0) {
      try {
        const zipData = await this.createZipFile(documents, parsedData.courseName);
        const zipFilename = `${this.sanitizeCourseName(parsedData.courseName)}_${parsedData.dateRange.start}_${parsedData.dateRange.end}.zip`;

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

    return {
      success: false,
      zipFilename: '',
      documents,
      totalGenerated,
      totalFailed,
    };
  }

  /**
   * Generate document for a single day
   */
  private async generateDayDocument(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData,
    templateFile: File
  ): Promise<DayDocumentResult> {
    try {
      // Convert day data to LessonData format
      const lessonData = this.convertDayToLessonData(day, parsedData);

      // Generate document
      const documentData = await this.generateDocument(lessonData, templateFile);

      const filename = `${this.sanitizeCourseName(parsedData.courseName)}_${day.date}.docx`;

      return {
        date: day.date,
        filename,
        success: true,
        documentData,
      };
    } catch (error) {
      return {
        date: day.date,
        filename: `${this.sanitizeCourseName(parsedData.courseName)}_${day.date}.docx`,
        success: false,
        error: error instanceof Error ? error.message : 'Errore generazione documento',
      };
    }
  }

  /**
   * Convert day data to LessonData format
   */
  private convertDayToLessonData(
    day: FullCourseDayData,
    parsedData: ParsedFullCourseData
  ): LessonData {
    // Group sessions by participant
    const participantSessions = new Map<string, any[]>();

    for (const session of day.sessions) {
      // Find the actual participant info (handle aliases)
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

    // Determine if morning/afternoon based on times
    const morningParticipants: any[] = [];
    const afternoonParticipants: any[] = [];

    for (const [name, sessions] of participantSessions) {
      for (const session of sessions) {
        const hour = session.joinTime.getHours();
        if (hour < 13) {
          morningParticipants.push(session);
        } else {
          afternoonParticipants.push(session);
        }
      }
    }

    // Process participants using existing logic
    const { participants, organizer } = processParticipants(
      morningParticipants,
      afternoonParticipants
    );

    // Determine lesson type
    const lessonType = this.determineLessonType(morningParticipants.length, afternoonParticipants.length);

    // Calculate lesson hours
    const lessonHours = LessonService.calculateDynamicLessonHours(participants, organizer, lessonType);

    return {
      date: new Date(day.date),
      subject: day.courseName,
      courseId: parsedData.zoomMeetingId,
      participants,
      organizer,
      lessonType,
      lessonHours,
      actualStartTime: day.startTime,
      actualEndTime: day.endTime,
    };
  }

  /**
   * Generate Word document from lesson data
   */
  private async generateDocument(
    lessonData: LessonData,
    templateFile: File
  ): Promise<ArrayBuffer> {
    // Read template
    const templateBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(templateBuffer);

    // Configure docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
      nullGetter: () => '',
      errorLogging: false,
    });

    // Prepare template data (reuse existing logic)
    const templateData = this.prepareTemplateData(lessonData);

    // Render
    doc.render(templateData);

    // Generate
    const output = doc.getZip().generate({
      type: 'arraybuffer',
    });

    return output;
  }

  /**
   * Prepare template data (simplified version from wordGenerator)
   */
  private prepareTemplateData(lessonData: LessonData): WordTemplateData {
    const date = lessonData.date;

    const templateData: WordTemplateData = {
      day: format(date, 'dd'),
      month: format(date, 'MM'),
      year: format(date, 'yyyy'),
      orariolezione: this.getScheduleText(lessonData),
      argomento: lessonData.subject || '',
    };

    // Add participants (up to 5)
    const sortedParticipants = [...lessonData.participants]
      .filter(p => !p.isOrganizer)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < 5; i++) {
      const index = i + 1;
      const participant = sortedParticipants[i];

      if (participant) {
        templateData[`partecipante${index}`] = participant.name;
        templateData[`ingresso${index}m`] = this.formatTime(participant.morningFirstJoin);
        templateData[`uscita${index}m`] = this.formatTime(participant.morningLastLeave);
        templateData[`ingresso${index}p`] = this.formatTime(participant.afternoonFirstJoin);
        templateData[`uscita${index}p`] = this.formatTime(participant.afternoonLastLeave);
        templateData[`assente${index}`] = participant.isPresent ? '' : 'X';
      } else {
        templateData[`partecipante${index}`] = '';
        templateData[`ingresso${index}m`] = '';
        templateData[`uscita${index}m`] = '';
        templateData[`ingresso${index}p`] = '';
        templateData[`uscita${index}p`] = '';
        templateData[`assente${index}`] = '';
      }
    }

    return templateData;
  }

  /**
   * Create ZIP file from documents
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
    const zipBlob = zip.generate({
      type: 'blob',
      mimeType: 'application/zip',
    });

    return zipBlob;
  }

  // Helper methods

  private findParticipantByName(name: string, participants: any[]) {
    return participants.find(
      p => p.primaryName === name || p.aliases.includes(name)
    );
  }

  private determineLessonType(morningCount: number, afternoonCount: number): LessonType {
    if (morningCount > 0 && afternoonCount > 0) return 'both';
    if (morningCount > 0) return 'morning';
    if (afternoonCount > 0) return 'afternoon';
    return 'fast';
  }

  private getScheduleText(lessonData: LessonData): string {
    const hours = lessonData.lessonHours || [];
    if (hours.length === 0) return '';

    const formatHour = (h: number) => {
      const hour = Math.floor(h);
      const minutes = Math.round((h - hour) * 60);
      return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    if (hours.length === 2) {
      return `${formatHour(hours[0])} - ${formatHour(hours[1])}`;
    } else if (hours.length === 4) {
      return `${formatHour(hours[0])} - ${formatHour(hours[1])} / ${formatHour(hours[2])} - ${formatHour(hours[3])}`;
    }

    return '';
  }

  private formatTime(date?: Date): string {
    if (!date) return '';
    return format(date, 'HH:mm');
  }

  private sanitizeCourseName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  }
}

// Singleton instance
export const fullCourseDocumentGenerator = new FullCourseDocumentGenerator();
