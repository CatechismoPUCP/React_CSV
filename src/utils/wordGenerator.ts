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
    
    // Generate filename
    const dateStr = format(lessonData.date, 'yyyy_MM_dd');
    const filename = `registro_presenza_${dateStr}.docx`;
    
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
    orarioLezione: getScheduleText(lessonData.lessonType),
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
    
    // Presence status
    templateData[`presenza${index}` as keyof WordTemplateData] = participant.isPresent ? '✅' : '❌ ASSENTE';
  });
  
  return templateData;
};

const getScheduleText = (lessonType: 'morning' | 'afternoon' | 'both'): string => {
  switch (lessonType) {
    case 'morning':
      return '09:00 - 13:00';
    case 'afternoon':
      return '14:00 - 18:00';
    case 'both':
      return '09:00 - 13:00 / 14:00 - 18:00';
    default:
      return '';
  }
};

const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};
