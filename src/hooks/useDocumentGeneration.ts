import { useState } from 'react';
import { generateWordDocument } from '../utils/wordGenerator';
import { DateService } from '../services/dateService';
import { LessonData, ProcessedParticipant, LessonType } from '../types';

/**
 * Custom hook for generating Word documents from processed lesson data
 * 
 * Handles the complete workflow of:
 * - Date extraction and validation
 * - Lesson data preparation
 * - Word document generation
 * - Error handling and user feedback
 * 
 * @returns Object with generation state and generateDocument function
 */
export const useDocumentGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Generates a Word document from processed lesson data
   * 
   * @param templateFile - Word template file (.docx)
   * @param subject - Lesson subject/topic
   * @param courseId - Optional course identifier
   * @param participants - Array of processed participants
   * @param organizer - Optional lesson organizer
   * @param lessonType - Type of lesson (morning, afternoon, both, fast)
   * @param lessonHours - Array of lesson hours
   * @param morningFile - Morning CSV file for date extraction
   * @param afternoonFile - Afternoon CSV file for date extraction
   * @param onSuccess - Callback function called on successful generation
   * @param onError - Callback function called with error message on failure
   */
  const generateDocument = async (
    templateFile: File | null,
    subject: string,
    courseId: string,
    participants: ProcessedParticipant[],
    organizer: ProcessedParticipant | null,
    lessonType: LessonType,
    lessonHours: number[],
    morningFile: File | null,
    afternoonFile: File | null,
    onSuccess: () => void,
    onError: (error: string) => void
  ) => {
    // Validate required template file
    if (!templateFile) {
      onError('MISSING_TEMPLATE');
      return;
    }

    setIsGenerating(true);

    try {
      // Extract lesson date using multiple fallback strategies
      const lessonDate = extractLessonDate(participants, organizer, morningFile, afternoonFile);

      // Prepare comprehensive lesson data for document generation
      const lessonData: LessonData = {
        date: lessonDate,
        subject: subject.trim(),
        courseId: courseId.trim() || undefined,
        participants: participants,
        organizer: organizer || undefined,
        lessonType: lessonType,
        lessonHours: lessonHours
      };

      // Generate and download the Word document
      await generateWordDocument(lessonData, templateFile);
      onSuccess();
    } catch (err) {
      // Handle document generation errors
      const errorMessage = (err as Error).message;
      onError(errorMessage);
    } finally {
      // Always reset generation state
      setIsGenerating(false);
    }
  };

  /**
   * Extracts the lesson date using multiple fallback strategies
   * 
   * Priority order:
   * 1. Date from participant connection data
   * 2. Date extracted from CSV filename
   * 3. Current date as fallback
   * 
   * @param participants - Array of processed participants
   * @param organizer - Optional lesson organizer
   * @param morningFile - Morning CSV file
   * @param afternoonFile - Afternoon CSV file
   * @returns Date object representing the lesson date
   */
  const extractLessonDate = (
    participants: ProcessedParticipant[],
    organizer: ProcessedParticipant | null,
    morningFile: File | null,
    afternoonFile: File | null
  ): Date => {
    // Try to extract date from participant data first (most accurate)
    const participantDate = DateService.extractDateFromParticipants(participants, organizer);
    if (participantDate) {
      return participantDate;
    }

    // Fallback to filename date extraction
    const dateFile = morningFile || afternoonFile;
    const filenameDate = DateService.extractDateFromFilename(dateFile);
    if (filenameDate) {
      return filenameDate;
    }

    // Final fallback to current date
    return new Date();
  };

  return {
    /** Whether document is currently being generated */
    isGenerating,
    /** Function to generate Word document from lesson data */
    generateDocument,
  };
};
