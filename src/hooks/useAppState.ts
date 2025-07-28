import { useState } from 'react';
import { ProcessedParticipant, LessonType } from '../types';
import { APP_STEPS } from '../constants';

export type AppStep = typeof APP_STEPS[keyof typeof APP_STEPS];

export const useAppState = () => {
  const [lessonType, setLessonType] = useState<LessonType>('both');
  const [morningFile, setMorningFile] = useState<File | null>(null);
  const [afternoonFile, setAfternoonFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [courseId, setCourseId] = useState('');
  const [participants, setParticipants] = useState<ProcessedParticipant[]>([]);
  const [organizer, setOrganizer] = useState<ProcessedParticipant | null>(null);
  const [lessonHours, setLessonHours] = useState<number[]>([]);
  const [step, setStep] = useState<AppStep>(APP_STEPS.UPLOAD);
  const [debugMode, setDebugMode] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);

  const resetApp = () => {
    setStep(APP_STEPS.UPLOAD);
    setParticipants([]);
  };

  return {
    // State
    lessonType,
    morningFile,
    afternoonFile,
    templateFile,
    subject,
    courseId,
    participants,
    organizer,
    lessonHours,
    step,
    debugMode,
    showTemplateGuide,
    
    // Setters
    setLessonType,
    setMorningFile,
    setAfternoonFile,
    setTemplateFile,
    setSubject,
    setCourseId,
    setParticipants,
    setOrganizer,
    setLessonHours,
    setStep,
    setDebugMode,
    setShowTemplateGuide,
    
    // Actions
    resetApp,
  };
};
