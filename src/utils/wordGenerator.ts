import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LessonData, WordTemplateData, ProcessedParticipant } from '../types';

export const generateWordDocument = async (
  lessonData: LessonData,
  templateFile: File
): Promise<void> => {
  try {
    // Read template file
    const templateBuffer = await templateFile.arrayBuffer();
    const zip = new PizZip(templateBuffer);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      },
      nullGetter: function() {
        return '';
      },
      errorLogging: false
    });
    
    // Prepare template data
    const templateData = prepareTemplateData(lessonData);
    
    console.log('Template data:', templateData);
    
    // Render document
    doc.render(templateData);
    
    // Check for errors
    const errors = doc.getFullText();
    
    // Generate output
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Generate filename with course ID
    const dateStr = format(lessonData.date, 'yyyy_MM_dd');
    const courseId = lessonData.courseId || 'CORSO';
    const filename = `modello B fad_${courseId}_${dateStr}.docx`;
    
    // Save file
    saveAs(output, filename);
  } catch (error: any) {
    console.error('Errore durante la generazione del documento Word:', error);
    
    // More detailed error logging
    if (error.properties && error.properties.errors) {
      console.error('Template errors:', error.properties.errors);
      const errorMessages = error.properties.errors.map((err: any) => 
        `${err.message} at ${err.properties?.id || 'unknown location'}`
      ).join(', ');
      throw new Error(`Errori nel template Word: ${errorMessages}`);
    }
    
    throw new Error('Errore durante la generazione del documento Word. Verifica che il template contenga i placeholder corretti.');
  }
};

const prepareTemplateData = (lessonData: LessonData): WordTemplateData => {
  const date = lessonData.date;
  
  // Prepare basic date and lesson info
  const templateData: WordTemplateData = {
    day: format(date, 'dd'),
    month: format(date, 'MM'),
    year: format(date, 'yyyy'),
    orariolezione: getScheduleText(lessonData.lessonType, lessonData.participants),
    argomento: lessonData.subject || '',
  };
  
  // Initialize all participant fields first
  for (let i = 1; i <= 5; i++) {
    templateData[`nome${i}` as keyof WordTemplateData] = '';
    templateData[`MattOraIn${i}` as keyof WordTemplateData] = '';
    templateData[`MattOraOut${i}` as keyof WordTemplateData] = '';
    templateData[`PomeOraIn${i}` as keyof WordTemplateData] = '';
    templateData[`PomeOraOut${i}` as keyof WordTemplateData] = '';
    templateData[`presenza${i}` as keyof WordTemplateData] = '';
  }
  
  // Add participant data (up to 5 participants)
  const participants = lessonData.participants.slice(0, 5);
  
  participants.forEach((participant, i) => {
    const index = i + 1;
    
    templateData[`nome${index}` as keyof WordTemplateData] = participant.name || '';
    
    // Check if participant is marked as absent
    if (!participant.isPresent) {
      // If absent, show "ASSENTE" instead of times
      if (lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = '';
      }
      if (lessonData.lessonType !== 'morning') {
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = '';
      }
    } else {
      // If present, show actual times (exact times, not rounded)
      // Morning times
      if (participant.morningFirstJoin && lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = formatTime(participant.morningFirstJoin);
      }
      
      if (participant.morningLastLeave && lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = formatTime(participant.morningLastLeave);
      }
      
      // Afternoon times
      if (participant.afternoonFirstJoin && lessonData.lessonType !== 'morning') {
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = formatTime(participant.afternoonFirstJoin);
      }
      
      if (participant.afternoonLastLeave && lessonData.lessonType !== 'morning') {
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = formatTime(participant.afternoonLastLeave);
      }
    }
    
    // Presence status
    templateData[`presenza${index}` as keyof WordTemplateData] = participant.isPresent ? '✅' : '❌ ASSENTE';
  });
  
  return templateData;
};

// Round time to nearest hour for better readability
const roundToNearestHour = (date: Date): Date => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  
  if (minutes >= 30) {
    // Round up to next hour
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    // Round down to current hour
    rounded.setHours(rounded.getHours(), 0, 0, 0);
  }
  
  return rounded;
};

// Get lesson end time based on start time and lesson type
const getLessonEndTime = (startTime: Date, lessonType: 'morning' | 'afternoon' | 'both'): Date => {
  const endTime = new Date(startTime);
  
  if (lessonType === 'morning') {
    endTime.setHours(13, 0, 0, 0); // Morning lessons end at 13:00
  } else if (lessonType === 'afternoon') {
    endTime.setHours(18, 0, 0, 0); // Afternoon lessons end at 18:00
  } else {
    // For 'both', return end of afternoon
    endTime.setHours(18, 0, 0, 0);
  }
  
  return endTime;
};

const getScheduleText = (lessonType: 'morning' | 'afternoon' | 'both', participants: ProcessedParticipant[]): string => {
  let startTime: Date | null = null;
  
  if (lessonType === 'morning' || lessonType === 'both') {
    const morningStarts = participants
      .filter(p => p.morningFirstJoin)
      .map(p => p.morningFirstJoin!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (morningStarts.length > 0) {
      const earliestStart = morningStarts[0];
      const roundedStart = roundToNearestHour(earliestStart);
      // Ensure morning doesn't start before 9:00
      if (roundedStart.getHours() < 9) {
        roundedStart.setHours(9, 0, 0, 0);
      }
      startTime = roundedStart;
    }
  }
  
  if (lessonType === 'afternoon' && !startTime) {
    const afternoonStarts = participants
      .filter(p => p.afternoonFirstJoin)
      .map(p => p.afternoonFirstJoin!)
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (afternoonStarts.length > 0) {
      const earliestStart = afternoonStarts[0];
      const roundedStart = roundToNearestHour(earliestStart);
      // Ensure afternoon doesn't start before 14:00
      if (roundedStart.getHours() < 14) {
        roundedStart.setHours(14, 0, 0, 0);
      }
      startTime = roundedStart;
    }
  }
  
  // Format the schedule based on lesson type with standard end times
  switch (lessonType) {
    case 'morning': {
      const start = startTime ? formatTime(startTime) : '09:00';
      return `${start} - 13:00`;
    }
    case 'afternoon': {
      const start = startTime ? formatTime(startTime) : '14:00';
      return `${start} - 18:00`;
    }
    case 'both': {
      const morningStart = startTime ? formatTime(startTime) : '09:00';
      return `${morningStart} - 13:00 / 14:00 - 18:00`;
    }
    default:
      return '';
  }
};

const formatTime = (date: Date, roundToHour: boolean = false): string => {
  if (roundToHour) {
    const rounded = roundToNearestHour(date);
    return format(rounded, 'HH:mm');
  }
  return format(date, 'HH:mm');
};
