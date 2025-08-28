import { useState } from 'react';
import { useFileProcessing } from './useFileProcessing';
import { useDocumentGeneration } from './useDocumentGeneration';
import { courseStorageService } from '../services/courseStorageService';
import { CourseData, DailyLessonData, ProcessedLessonData } from '../types/course';
import { LessonData, ProcessedParticipant } from '../types';
import { LessonType } from '../types';

interface BatchProcessingResult {
  date: string;
  success: boolean;
  participants?: ProcessedParticipant[];
  organizer?: ProcessedParticipant;
  lessonHours?: number[];
  error?: string;
}

interface DocumentGenerationResult {
  date: string;
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Hook for batch processing course lessons
 * Extends useFileProcessing for multi-day course management
 */
export const useCourseBatchProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingDate, setCurrentProcessingDate] = useState<string | null>(null);
  
  const { processFiles } = useFileProcessing();
  const { generateDocument } = useDocumentGeneration();

  /**
   * Process a single day's lesson data
   */
  const processDailyLesson = async (
    courseId: string,
    date: string,
    templateFile: File,
    subject?: string
  ): Promise<BatchProcessingResult> => {
    try {
      setCurrentProcessingDate(date);
      
      const dailyData = await courseStorageService.getDailyData(courseId, date);
      if (!dailyData) {
        return {
          date,
          success: false,
          error: 'Dati giornalieri non trovati'
        };
      }

      // Get CSV files
      const morningFile = dailyData.csvFiles.morning 
        ? new File([dailyData.csvFiles.morning.data], dailyData.csvFiles.morning.filename, { type: 'text/csv' })
        : null;
      
      const afternoonFile = dailyData.csvFiles.afternoon
        ? new File([dailyData.csvFiles.afternoon.data], dailyData.csvFiles.afternoon.filename, { type: 'text/csv' })
        : null;

      // Determine lesson type based on available files
      let lessonType: LessonType = 'fast';
      if (morningFile && afternoonFile) {
        lessonType = 'both';
      } else if (morningFile) {
        lessonType = 'morning';
      } else if (afternoonFile) {
        lessonType = 'afternoon';
      }

      return new Promise((resolve) => {
        processFiles(
          lessonType,
          morningFile,
          afternoonFile,
          templateFile,
          subject || `Lezione del ${date}`,
          (result) => {
            resolve({
              date,
              success: true,
              participants: result.participants,
              organizer: result.organizer,
              lessonHours: result.lessonHours,
            });
          },
          (error) => {
            resolve({
              date,
              success: false,
              error,
            });
          }
        );
      });
    } catch (error) {
      return {
        date,
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  };

  /**
   * Process multiple days in batch
   */
  const processBatchLessons = async (
    course: CourseData,
    dates: string[],
    templateFile: File,
    onProgress?: (current: number, total: number, currentDate: string) => void,
    onDayComplete?: (result: BatchProcessingResult) => void
  ): Promise<BatchProcessingResult[]> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const results: BatchProcessingResult[] = [];
    
    try {
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const lesson = course.schedule.find(l => l.date === date);
        
        onProgress?.(i + 1, dates.length, date);
        setProcessingProgress(((i + 1) / dates.length) * 100);
        
        const result = await processDailyLesson(
          course.courseId,
          date,
          templateFile,
          lesson?.subject
        );
        
        results.push(result);
        onDayComplete?.(result);
        
        // Save processed data if successful
        if (result.success) {
          await saveDailyProcessedData(course.courseId, date, result, lesson);
        }
      }
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setCurrentProcessingDate(null);
    }
    
    return results;
  };

  /**
   * Generate documents for processed lessons
   */
  const generateBatchDocuments = async (
    course: CourseData,
    dates: string[],
    templateFile: File,
    onProgress?: (current: number, total: number, currentDate: string) => void,
    onDocumentComplete?: (result: DocumentGenerationResult) => void
  ): Promise<DocumentGenerationResult[]> => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const results: DocumentGenerationResult[] = [];
    
    try {
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        
        onProgress?.(i + 1, dates.length, date);
        setProcessingProgress(((i + 1) / dates.length) * 100);
        setCurrentProcessingDate(date);
        
        const dailyData = await courseStorageService.getDailyData(course.courseId, date);
        
        if (!dailyData?.processedData) {
          results.push({
            date,
            success: false,
            error: 'Dati non elaborati per questa data'
          });
          continue;
        }
        
        try {
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

          const document = await new Promise<{ filename: string; data: ArrayBuffer }>((resolve, reject) => {
            generateDocument(
              templateFile,
              dailyData.processedData!.subject || 'Lezione',
              course.courseId,
              dailyData.processedData!.participants,
              dailyData.processedData!.organizer || null,
              dailyData.processedData!.lessonType,
              dailyData.processedData!.lessonHours,
              dailyData.csvFiles.morning ? new File([dailyData.csvFiles.morning.data], dailyData.csvFiles.morning.filename) : null,
              dailyData.csvFiles.afternoon ? new File([dailyData.csvFiles.afternoon.data], dailyData.csvFiles.afternoon.filename) : null,
              () => resolve({ filename: `Modulo_B_${date}.docx`, data: new ArrayBuffer(0) }),
              (error: string) => reject(new Error(error))
            );
          });

          // Save document to storage
          await saveGeneratedDocument(course.courseId, date, document);
          
          const result: DocumentGenerationResult = {
            date,
            success: true,
            filename: document.filename,
          };
          
          results.push(result);
          onDocumentComplete?.(result);
          
        } catch (error) {
          const result: DocumentGenerationResult = {
            date,
            success: false,
            error: error instanceof Error ? error.message : 'Errore nella generazione'
          };
          
          results.push(result);
          onDocumentComplete?.(result);
        }
      }
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setCurrentProcessingDate(null);
    }
    
    return results;
  };

  /**
   * Generate absence report for a specific date
   */
  const generateAbsenceReport = async (
    course: CourseData,
    date: string
  ): Promise<{ success: boolean; filename?: string; error?: string }> => {
    try {
      const dailyData = await courseStorageService.getDailyData(course.courseId, date);
      
      if (!dailyData?.processedData) {
        return {
          success: false,
          error: 'Dati non elaborati per questa data'
        };
      }

      // Find absent participants
      const absentParticipants = course.participants.filter(participant => {
        const processedParticipant = dailyData.processedData!.participants.find(
          p => p.email.toLowerCase() === participant.email.toLowerCase()
        );
        return !processedParticipant || !processedParticipant.isPresent;
      });

      if (absentParticipants.length === 0) {
        return {
          success: false,
          error: 'Nessun assente per questa data'
        };
      }

      // Generate absence report (simplified - would need proper template)
      const reportContent = `Report Assenze - ${date}\n\n` +
        `Corso: ${course.courseInfo.name}\n` +
        `Data: ${date}\n\n` +
        `Partecipanti Assenti:\n` +
        absentParticipants.map(p => `- ${p.name} (${p.email})`).join('\n');

      const reportBlob = new Blob([reportContent], { type: 'text/plain' });
      const reportData = await reportBlob.arrayBuffer();
      const filename = `Assenze_${course.courseInfo.name.replace(/\s+/g, '_')}_${date}.txt`;

      // Save absence report
      const updatedDailyData = { ...dailyData };
      updatedDailyData.documents.absenceReport = {
        filename,
        data: reportData,
        generatedAt: new Date().toISOString(),
      };

      await courseStorageService.saveDailyData(updatedDailyData);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore nella generazione del report'
      };
    }
  };

  /**
   * Save processed data to storage
   */
  const saveDailyProcessedData = async (
    courseId: string,
    date: string,
    result: BatchProcessingResult,
    lesson?: any
  ) => {
    if (!result.success) return;

    const processedData: ProcessedLessonData = {
      date: new Date(date),
      subject: lesson?.subject || `Lezione del ${date}`,
      courseId,
      participants: result.participants!,
      organizer: result.organizer,
      lessonType: lesson?.lessonType || 'fast',
      lessonHours: result.lessonHours!,
      dayNumber: 1, // This should be calculated based on course schedule
      isProcessed: true,
      hasManualAdjustments: false,
    };

    const dailyData = await courseStorageService.getDailyData(courseId, date);
    if (dailyData) {
      dailyData.processedData = processedData;
      dailyData.status = 'completed';
      await courseStorageService.saveDailyData(dailyData);
    }
  };

  /**
   * Save generated document to storage
   */
  const saveGeneratedDocument = async (
    courseId: string,
    date: string,
    document: { filename: string; data: ArrayBuffer }
  ) => {
    const dailyData = await courseStorageService.getDailyData(courseId, date);
    if (dailyData) {
      dailyData.documents.moduloB = {
        filename: document.filename,
        data: document.data,
        generatedAt: new Date().toISOString(),
      };
      await courseStorageService.saveDailyData(dailyData);
    }
  };

  return {
    isProcessing,
    processingProgress,
    currentProcessingDate,
    processDailyLesson,
    processBatchLessons,
    generateBatchDocuments,
    generateAbsenceReport,
  };
};
