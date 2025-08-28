import { useState } from 'react';
import { parseZoomCSV, processParticipants } from '../utils/csvParser';
import { LessonService } from '../services/lessonService';
import { FileService } from '../services/fileService';
import { LessonType } from '../types';

/**
 * Custom hook for processing CSV files and extracting participant data
 * 
 * Handles the complete workflow of:
 * - File validation
 * - CSV parsing (morning/afternoon sessions)
 * - Participant data processing
 * - Dynamic lesson hours calculation
 * 
 * @returns Object with processing state and processFiles function
 */
export const useFileProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Processes uploaded CSV files and extracts participant attendance data
   * 
   * @param lessonType - Type of lesson (morning, afternoon, both, fast)
   * @param morningFile - Morning session CSV file (optional)
   * @param afternoonFile - Afternoon session CSV file (optional)
   * @param templateFile - Word template file for validation
   * @param subject - Lesson subject/topic
   * @param onSuccess - Callback function called with processed data on success
   * @param onError - Callback function called with error message on failure
   */
  const processFiles = async (
    lessonType: LessonType,
    morningFile: File | null,
    afternoonFile: File | null,
    templateFile: File | null,
    subject: string,
    onSuccess: (data: {
      participants: any[];
      organizer: any;
      lessonHours: number[];
    }) => void,
    onError: (error: string) => void
  ) => {
    // Validate all required files and inputs before processing
    const validationError = LessonService.validateLessonRequirements(
      lessonType,
      morningFile,
      afternoonFile,
      templateFile,
      subject
    );

    if (validationError) {
      onError(validationError);
      return;
    }

    setIsProcessing(true);

    try {
      // Initialize participant arrays for both sessions
      let morningParticipants: any[] = [];
      let afternoonParticipants: any[] = [];

      // Parse morning CSV file if required for this lesson type
      if (shouldProcessMorningFile(lessonType, morningFile)) {
        const morningContent = await FileService.readFileAsText(morningFile!);
        morningParticipants = parseZoomCSV(morningContent);
      }

      // Parse afternoon CSV file if required for this lesson type
      if (shouldProcessAfternoonFile(lessonType, afternoonFile)) {
        const afternoonContent = await FileService.readFileAsText(afternoonFile!);
        afternoonParticipants = parseZoomCSV(afternoonContent);
      }

      // Merge and process participant data from both sessions
      const { participants: processedParticipants, organizer: processedOrganizer } = 
        processParticipants(morningParticipants, afternoonParticipants);
      
      // Calculate actual lesson hours based on participant connection times
      const dynamicLessonHours = LessonService.calculateDynamicLessonHours(
        processedParticipants, 
        processedOrganizer, 
        lessonType
      );
      
      // Return processed data to the calling component
      onSuccess({
        participants: processedParticipants,
        organizer: processedOrganizer,
        lessonHours: dynamicLessonHours,
      });
    } catch (err) {
      // Handle any errors during CSV processing
      onError('CSV_PROCESSING_ERROR' + (err as Error).message);
    } finally {
      // Always reset processing state
      setIsProcessing(false);
    }
  };

  /**
   * Determines if morning file should be processed based on lesson type
   */
  const shouldProcessMorningFile = (lessonType: LessonType, morningFile: File | null): boolean => {
    return morningFile !== null && 
           (lessonType === 'morning' || lessonType === 'both' || lessonType === 'fast');
  };

  /**
   * Determines if afternoon file should be processed based on lesson type
   */
  const shouldProcessAfternoonFile = (lessonType: LessonType, afternoonFile: File | null): boolean => {
    return afternoonFile !== null && 
           (lessonType === 'afternoon' || lessonType === 'both' || lessonType === 'fast');
  };

  return {
    /** Whether files are currently being processed */
    isProcessing,
    /** Function to process uploaded CSV files */
    processFiles,
  };
};
