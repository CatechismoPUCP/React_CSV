import { CourseData, DailyLessonData, ProcessedLessonData } from '../types/course';
import { LessonData, ProcessedParticipant, LessonType } from '../types';
import { courseStorageService } from './courseStorageService';
import { parseZoomCSV, processParticipants } from '../utils/csvParser';
import { LessonService } from './lessonService';
import { FileService } from './fileService';
// DocumentService will be implemented separately - using direct document generation for now

export interface BatchProcessingOptions {
  templateFile: File;
  onProgress?: (current: number, total: number, currentDate: string) => void;
  onDayComplete?: (date: string, success: boolean, error?: string) => void;
  onDocumentGenerated?: (date: string, filename: string) => void;
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: Array<{
    date: string;
    success: boolean;
    error?: string;
    participantCount?: number;
    documentGenerated?: boolean;
  }>;
}

/**
 * Service for batch processing course lessons
 * Handles multiple days processing, document generation, and error management
 */
export class CourseBatchProcessor {
  private isProcessing = false;
  private currentProgress = 0;

  /**
   * Process all pending lessons for a course
   */
  async processAllPendingLessons(
    course: CourseData,
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Batch processing già in corso');
    }

    this.isProcessing = true;
    this.currentProgress = 0;

    try {
      // Get all lessons with uploaded CSV files but not yet processed
      const pendingDates = await this.getPendingLessonDates(course.courseId);
      
      if (pendingDates.length === 0) {
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      return await this.processBatchDates(course, pendingDates, options);
    } finally {
      this.isProcessing = false;
      this.currentProgress = 0;
    }
  }

  /**
   * Process specific lesson dates
   */
  async processSpecificLessons(
    course: CourseData,
    dates: string[],
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Batch processing già in corso');
    }

    this.isProcessing = true;
    this.currentProgress = 0;

    try {
      return await this.processBatchDates(course, dates, options);
    } finally {
      this.isProcessing = false;
      this.currentProgress = 0;
    }
  }

  /**
   * Generate documents for all processed lessons
   */
  async generateAllDocuments(
    course: CourseData,
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Batch processing già in corso');
    }

    this.isProcessing = true;
    this.currentProgress = 0;

    try {
      // Get all processed lessons without documents
      const processedDates = await this.getProcessedLessonDatesWithoutDocuments(course.courseId);
      
      if (processedDates.length === 0) {
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          results: []
        };
      }

      return await this.generateBatchDocuments(course, processedDates, options);
    } finally {
      this.isProcessing = false;
      this.currentProgress = 0;
    }
  }

  /**
   * Process a single lesson day
   */
  async processSingleLesson(
    course: CourseData,
    date: string,
    templateFile: File
  ): Promise<{ success: boolean; error?: string; participantCount?: number }> {
    try {
      const dailyData = await courseStorageService.getDailyData(course.courseId, date);
      if (!dailyData) {
        return { success: false, error: 'Dati giornalieri non trovati' };
      }

      // Check if already processed
      if (dailyData.status === 'completed') {
        return { success: false, error: 'Lezione già elaborata' };
      }

      // Update status to processing
      dailyData.status = 'processing';
      await courseStorageService.saveDailyData(dailyData);

      // Get lesson info
      const lesson = course.schedule.find(l => l.date === date);
      
      // Process CSV files
      const result = await this.processLessonCSVFiles(dailyData, lesson?.subject || `Lezione del ${date}`);
      
      if (!result.success) {
        dailyData.status = 'error';
        await courseStorageService.saveDailyData(dailyData);
        return result;
      }

      // Save processed data
      const processedData: ProcessedLessonData = {
        date: new Date(date),
        subject: lesson?.subject || `Lezione del ${date}`,
        courseId: course.courseId,
        participants: result.participants!,
        organizer: result.organizer || undefined,
        lessonType: this.determineLessonType(dailyData),
        lessonHours: result.lessonHours!,
        dayNumber: this.calculateDayNumber(course, date),
        isProcessed: true,
        hasManualAdjustments: false,
        actualEndTime: dailyData.processedData?.actualEndTime,
        actualStartTime: dailyData.processedData?.actualStartTime,
      };

      dailyData.processedData = processedData;
      dailyData.status = 'completed';
      await courseStorageService.saveDailyData(dailyData);

      // Generate document if auto-generation is enabled
      if (course.settings.autoGenerateDocuments) {
        await this.generateDocumentForLesson(course, date, templateFile);
      }

      return { 
        success: true, 
        participantCount: result.participants!.length 
      };
    } catch (error) {
      // Update status to error
      const dailyData = await courseStorageService.getDailyData(course.courseId, date);
      if (dailyData) {
        dailyData.status = 'error';
        await courseStorageService.saveDailyData(dailyData);
      }

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      };
    }
  }

  /**
   * Generate document for a specific lesson
   */
  async generateDocumentForLesson(
    course: CourseData,
    date: string,
    templateFile: File
  ): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      const dailyData = await courseStorageService.getDailyData(course.courseId, date);
      
      if (!dailyData?.processedData) {
        return { success: false, error: 'Dati non elaborati per questa data' };
      }

      // Convert to LessonData format
      const lessonData: LessonData = {
        date: new Date(date),
        subject: dailyData.processedData.subject,
        courseId: course.courseId,
        participants: dailyData.processedData.participants,
        organizer: dailyData.processedData.organizer,
        lessonType: dailyData.processedData.lessonType,
        actualStartTime: dailyData.processedData.actualStartTime,
        actualEndTime: dailyData.processedData.actualEndTime,
        lessonHours: dailyData.processedData.lessonHours,
      };

      // Generate document
      const document = await this.generateDocumentPlaceholder({lessonData, templateFile});
      
      // Save document
      dailyData.documents.moduloB = {
        filename: document.filename,
        data: document.data,
        generatedAt: new Date().toISOString(),
      };

      await courseStorageService.saveDailyData(dailyData);

      return { success: true, filename: document.filename };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore nella generazione del documento' 
      };
    }
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): { isProcessing: boolean; progress: number } {
    return {
      isProcessing: this.isProcessing,
      progress: this.currentProgress
    };
  }

  // Private methods

  private async getPendingLessonDates(courseId: string): Promise<string[]> {
    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    return allDailyData
      .filter(data => 
        (data.csvFiles.morning || data.csvFiles.afternoon) && 
        data.status !== 'completed'
      )
      .map(data => data.date);
  }

  private async getProcessedLessonDatesWithoutDocuments(courseId: string): Promise<string[]> {
    const allDailyData = await courseStorageService.getAllDailyDataForCourse(courseId);
    const processedData = allDailyData.filter((data: any) => data.processedData && data.processedData.participants);
    
    return processedData
      .filter((data: any) => !data.documents.moduloB)
      .map((data: any) => data.date);
  }

  private async processBatchDates(
    course: CourseData,
    dates: string[],
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    const results: BatchProcessingResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      this.currentProgress = ((i + 1) / dates.length) * 100;
      
      options.onProgress?.(i + 1, dates.length, date);

      const result = await this.processSingleLesson(course, date, options.templateFile);
      
      const resultEntry = {
        date,
        success: result.success,
        error: result.error,
        participantCount: result.participantCount,
        documentGenerated: result.success && course.settings.autoGenerateDocuments,
      };

      results.push(resultEntry);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      options.onDayComplete?.(date, result.success, result.error);
    }

    return {
      totalProcessed: dates.length,
      successful,
      failed,
      results
    };
  }

  private async generateBatchDocuments(
    course: CourseData,
    dates: string[],
    options: BatchProcessingOptions
  ): Promise<BatchProcessingResult> {
    const results: BatchProcessingResult['results'] = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      this.currentProgress = ((i + 1) / dates.length) * 100;
      
      options.onProgress?.(i + 1, dates.length, date);

      const result = await this.generateDocumentForLesson(course, date, options.templateFile);
      
      const resultEntry = {
        date,
        success: result.success,
        error: result.error,
        documentGenerated: result.success,
      };

      results.push(resultEntry);
      
      if (result.success) {
        successful++;
        options.onDocumentGenerated?.(date, result.filename!);
      } else {
        failed++;
      }

      options.onDayComplete?.(date, result.success, result.error);
    }

    return {
      totalProcessed: dates.length,
      successful,
      failed,
      results
    };
  }

  private async processLessonCSVFiles(
    dailyData: DailyLessonData,
    subject: string
  ): Promise<{ 
    success: boolean; 
    participants?: ProcessedParticipant[]; 
    organizer?: ProcessedParticipant;
    lessonHours?: number[];
    error?: string;
  }> {
    try {
      let morningParticipants: any[] = [];
      let afternoonParticipants: any[] = [];

      // Process morning CSV
      if (dailyData.csvFiles.morning) {
        const morningContent = new TextDecoder().decode(dailyData.csvFiles.morning.data);
        morningParticipants = parseZoomCSV(morningContent);
      }

      // Process afternoon CSV
      if (dailyData.csvFiles.afternoon) {
        const afternoonContent = new TextDecoder().decode(dailyData.csvFiles.afternoon.data);
        afternoonParticipants = parseZoomCSV(afternoonContent);
      }

      // Process participants
      const { participants, organizer } = processParticipants(morningParticipants, afternoonParticipants);
      
      // Calculate lesson hours
      const lessonType = this.determineLessonType(dailyData);
      const lessonHours = LessonService.calculateDynamicLessonHours(participants, organizer, lessonType);

      return {
        success: true,
        participants,
        organizer: organizer || undefined,
        lessonHours
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore nell\'elaborazione CSV'
      };
    }
  }

  private determineLessonType(dailyData: DailyLessonData): LessonType {
    const hasMorning = !!dailyData.csvFiles.morning;
    const hasAfternoon = !!dailyData.csvFiles.afternoon;

    if (hasMorning && hasAfternoon) return 'both';
    if (hasMorning) return 'morning';
    if (hasAfternoon) return 'afternoon';
    return 'fast';
  }

  private calculateDayNumber(course: CourseData, date: string): number {
    const sortedSchedule = [...course.schedule].sort((a, b) => a.date.localeCompare(b.date));
    const index = sortedSchedule.findIndex(lesson => lesson.date === date);
    return index + 1;
  }

  private async generateDocumentPlaceholder(params: { lessonData: any; templateFile: File }) {
    // Placeholder for document generation - will be replaced with actual DocumentService
    return {
      filename: `modulo_b_${params.lessonData.date.toISOString().split('T')[0]}.docx`,
      data: new Uint8Array(0) // Empty document for now
    };
  }
}

// Singleton instance
export const courseBatchProcessor = new CourseBatchProcessor();
