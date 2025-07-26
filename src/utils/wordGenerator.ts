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
    
    // Generate filename with course ID (if provided)
    const dateStr = format(lessonData.date, 'yyyy_MM_dd');
    let filename = `modello B fad_${dateStr}.docx`;
    if (lessonData.courseId) {
      filename = `modello B fad_${lessonData.courseId}_${dateStr}.docx`;
    }
    
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
    orariolezione: getScheduleText(lessonData.lessonType, lessonData.participants, lessonData.organizer, lessonData.lessonHours),
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
    
    // Check if participant is explicitly marked as absent or has no sessions
    const isExplicitlyAbsent = participant.isAbsent || (!participant.isPresent && 
      participant.sessions.morning.length === 0 && participant.sessions.afternoon.length === 0);
    
    if (isExplicitlyAbsent) {
      // If explicitly absent, all placeholders become "ASSENTE"
      if (lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = 'ASSENTE';
      }
      if (lessonData.lessonType !== 'morning') {
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = 'ASSENTE';
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = 'ASSENTE';
      }
      templateData[`presenza${index}` as keyof WordTemplateData] = 'ASSENTE';
    } else {
      // If present, show actual times with seconds precision
      // Morning times
      if (participant.morningFirstJoin && lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraIn${index}` as keyof WordTemplateData] = formatTimeWithSeconds(participant.morningFirstJoin);
      }
      
      if (participant.morningLastLeave && lessonData.lessonType !== 'afternoon') {
        templateData[`MattOraOut${index}` as keyof WordTemplateData] = formatTimeWithSeconds(participant.morningLastLeave);
      }
      
      // Afternoon times
      if (participant.afternoonFirstJoin && lessonData.lessonType !== 'morning') {
        templateData[`PomeOraIn${index}` as keyof WordTemplateData] = formatTimeWithSeconds(participant.afternoonFirstJoin);
      }
      
      if (participant.afternoonLastLeave && lessonData.lessonType !== 'morning') {
        templateData[`PomeOraOut${index}` as keyof WordTemplateData] = formatTimeWithSeconds(participant.afternoonLastLeave);
      }
      
      // Presence status with connection details
      const connectionsList = formatAllConnections(participant, lessonData.lessonType);
      templateData[`presenza${index}` as keyof WordTemplateData] = participant.isPresent ? 
        `✅ ${connectionsList}` : `❌ ${connectionsList}`;
    }
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

// Get actual session end hour based on participant data
const getActualSessionEndHour = (participants: ProcessedParticipant[], session: 'morning' | 'afternoon'): number => {
  const endTimes: Date[] = [];
  
  participants.forEach(participant => {
    if (session === 'morning' && participant.morningLastLeave) {
      endTimes.push(participant.morningLastLeave);
    } else if (session === 'afternoon' && participant.afternoonLastLeave) {
      endTimes.push(participant.afternoonLastLeave);
    }
  });
  
  if (endTimes.length === 0) {
    // Fallback to default end times
    return session === 'morning' ? 13 : 18;
  }
  
  // Find the latest end time and round to nearest hour
  const latestEndTime = new Date(Math.max(...endTimes.map(t => t.getTime())));
  const roundedEndTime = roundToNearestHour(latestEndTime);
  
  return roundedEndTime.getHours();
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

const getScheduleText = (
  lessonType: 'morning' | 'afternoon' | 'both', 
  participants: ProcessedParticipant[], 
  organizer?: ProcessedParticipant, 
  lessonHours?: number[]
): string => {
  // Combine participants and organizer for analysis
  const allParticipants = organizer ? [...participants, organizer] : participants;
  
  // Use dynamic lesson hours if available
  if (lessonHours && lessonHours.length > 0) {
    const sortedHours = [...lessonHours].sort((a, b) => a - b);
    const startHour = sortedHours[0];
    const endHour = sortedHours[sortedHours.length - 1];
    
    // Determine if it's morning, afternoon, or both based on hours
    const morningHours = sortedHours.filter(h => h >= 9 && h <= 13);
    const afternoonHours = sortedHours.filter(h => h >= 14 && h <= 18);
    
    if (morningHours.length > 0 && afternoonHours.length > 0) {
      // Both sessions - calculate actual end times based on participant data
      const morningStart = Math.min(...morningHours);
      const morningEnd = getActualSessionEndHour(allParticipants, 'morning');
      const afternoonStart = Math.min(...afternoonHours);
      const afternoonEnd = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${morningStart.toString().padStart(2, '0')}:00 - ${morningEnd.toString().padStart(2, '0')}:00 / ${afternoonStart.toString().padStart(2, '0')}:00 - ${afternoonEnd.toString().padStart(2, '0')}:00`;
    } else if (morningHours.length > 0) {
      // Morning only
      const start = Math.min(...morningHours);
      const end = getActualSessionEndHour(allParticipants, 'morning');
      return `${start.toString().padStart(2, '0')}:00 - ${end.toString().padStart(2, '0')}:00`;
    } else if (afternoonHours.length > 0) {
      // Afternoon only
      const start = Math.min(...afternoonHours);
      const end = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${start.toString().padStart(2, '0')}:00 - ${end.toString().padStart(2, '0')}:00`;
    }
  }
  
  // Fallback to original logic if no dynamic hours
  let startTime: Date | null = null;
  
  if (lessonType === 'morning' || lessonType === 'both') {
    const morningStarts = allParticipants
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
    const afternoonStarts = allParticipants
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
  
  // Format the schedule based on lesson type with actual end times
  switch (lessonType) {
    case 'morning': {
      const start = startTime ? formatTime(startTime) : '09:00';
      const end = getActualSessionEndHour(allParticipants, 'morning');
      return `${start} - ${end.toString().padStart(2, '0')}:00`;
    }
    case 'afternoon': {
      const start = startTime ? formatTime(startTime) : '14:00';
      const end = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${start} - ${end.toString().padStart(2, '0')}:00`;
    }
    case 'both': {
      const morningStart = startTime ? formatTime(startTime) : '09:00';
      const morningEnd = getActualSessionEndHour(allParticipants, 'morning');
      const afternoonEnd = getActualSessionEndHour(allParticipants, 'afternoon');
      return `${morningStart} - ${morningEnd.toString().padStart(2, '0')}:00 / 14:00 - ${afternoonEnd.toString().padStart(2, '0')}:00`;
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

// Format time with seconds for detailed logging
const formatTimeWithSeconds = (date: Date): string => {
  return format(date, 'HH:mm:ss');
};

// Format all connections for a participant
const formatAllConnections = (participant: ProcessedParticipant, lessonType: 'morning' | 'afternoon' | 'both'): string => {
  const connections: string[] = [];
  
  // Morning connections
  if (lessonType !== 'afternoon' && participant.allConnections.morning.length > 0) {
    const morningConnections = participant.allConnections.morning
      .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
      .join(', ');
    connections.push(`Mattina: ${morningConnections}`);
  }
  
  // Afternoon connections
  if (lessonType !== 'morning' && participant.allConnections.afternoon.length > 0) {
    const afternoonConnections = participant.allConnections.afternoon
      .map(conn => `${formatTimeWithSeconds(conn.joinTime)}-${formatTimeWithSeconds(conn.leaveTime)}`)
      .join(', ');
    connections.push(`Pomeriggio: ${afternoonConnections}`);
  }
  
  return connections.length > 0 ? connections.join(' | ') : 'Nessuna connessione';
};
