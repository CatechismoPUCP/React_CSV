import { useState } from 'react';
import { generateWordDocument } from '../utils/wordGenerator';
import { DateService } from '../services/dateService';
import { LessonData, ProcessedParticipant, LessonType } from '../types';


export const useDocumentGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (!templateFile) {
      onError('MISSING_TEMPLATE');
      return;
    }

    setIsGenerating(true);

    try {
      // Extract date from filename
      const dateFile = morningFile || afternoonFile;
      const lessonDate = DateService.extractDateFromFilename(dateFile);

      const lessonData: LessonData = {
        date: lessonDate,
        subject: subject.trim(),
        courseId: courseId.trim() || undefined,
        participants: participants,
        organizer: organizer || undefined,
        lessonType: lessonType,
        lessonHours: lessonHours
      };

      await generateWordDocument(lessonData, templateFile);
      onSuccess();
    } catch (err) {
      const errorMessage = (err as Error).message;
      onError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    generateDocument,
  };
};
