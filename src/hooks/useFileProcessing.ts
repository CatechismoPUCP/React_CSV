import { useState } from 'react';
import { parseZoomCSV, processParticipants } from '../utils/csvParser';
import { LessonService } from '../services/lessonService';
import { FileService } from '../services/fileService';
import { LessonType } from '../types';
import { useErrorHandler } from './useErrorHandler';
import { APP_STEPS } from '../constants';

export const useFileProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { handleError } = useErrorHandler();

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
    // Validate requirements
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
      let morningParticipants: any[] = [];
      let afternoonParticipants: any[] = [];

      // Parse morning CSV if needed
      if (morningFile && (lessonType === 'morning' || lessonType === 'both' || lessonType === 'fast')) {
        const morningContent = await FileService.readFileAsText(morningFile);
        morningParticipants = parseZoomCSV(morningContent);
      }

      // Parse afternoon CSV if needed
      if (afternoonFile && (lessonType === 'afternoon' || lessonType === 'both' || lessonType === 'fast')) {
        const afternoonContent = await FileService.readFileAsText(afternoonFile);
        afternoonParticipants = parseZoomCSV(afternoonContent);
      }

      // Process participants
      const { participants: processedParticipants, organizer: processedOrganizer } = 
        processParticipants(morningParticipants, afternoonParticipants);
      
      // Calculate dynamic lesson hours based on actual data
      const dynamicLessonHours = LessonService.calculateDynamicLessonHours(
        processedParticipants, 
        processedOrganizer, 
        lessonType
      );
      
      onSuccess({
        participants: processedParticipants,
        organizer: processedOrganizer,
        lessonHours: dynamicLessonHours,
      });
    } catch (err) {
      onError('CSV_PROCESSING_ERROR' + (err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processFiles,
  };
};
